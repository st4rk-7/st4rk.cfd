---
title: I Spent a Week Debugging a $8 STM32 Board. Here's Everything That Went Wrong.
date: 2026-06-03T10:00:00.000+00:00
lang: en
duration: 10min
---

# I Spent a Week Debugging a $8 STM32 Board. Here's Everything That Went Wrong.

It started with a cheap STM32F407 board from AliExpress and a BME280 temperature sensor. The plan was simple: wire up the sensor, write some C code, read the temperature. Maybe a weekend project.

It took me an entire week. Not because the code was complicated, but because I ran into a chain of hardware and toolchain problems that no tutorial warned me about. A physical plastic cap on the board was preventing all code from running. The external crystal oscillator was dead. The USB port couldn't do serial. And every time I fixed one thing, something else broke underneath it.

This is the full story of what happened, in the order it happened, with the actual code and commands I used. If you're working with clone STM32 boards or trying bare-metal programming for the first time, you'll probably hit at least half of these same walls.

---

My setup: a DIYmore STM32F407VGT6 board (a Chinese clone, about $8), a BME280 breakout board, a clone ST-Link V2 USB programmer, and Arch Linux with `arm-none-eabi-gcc`, CMake, and OpenOCD. No IDE. Just a terminal and VS Code.

## The board that wouldn't do anything

I generated a basic LED blink project with STM32CubeMX, compiled it, and flashed it using OpenOCD. The power LED came on, which meant the board was getting electricity. But nothing else happened. No blinking. No response to the reset button. The board was alive but completely ignoring my code.

I connected OpenOCD and asked it to halt the CPU and show me what was going on inside:

```
openocd -f openocd.cfg -c "init; halt; reg; exit"
```

The output was bad:

```
current mode: Handler HardFault
xPSR: 0x00000003 pc: 0x01000000 msp: 0xfffffff0
```

The CPU was stuck in a HardFault. It had crashed before my code even started running. The program counter was at `0x01000000`, an address that doesn't exist in this chip's memory. The stack pointer was `0xfffffff0`, which is the ARM default "something went very wrong" value.

I spent hours reading forum posts and thinking the problem was in my code. It wasn't.

## A plastic cap ruined my entire day

After digging through the STM32F407 reference manual's boot configuration section, I found the answer. Every STM32 chip has a pin called `BOOT0` that the CPU checks on every reset. If `BOOT0` is pulled to ground, the chip boots from Flash memory — where your code lives. If `BOOT0` is pulled high to 3.3V, the chip boots from a factory bootloader in system memory instead, and your Flash code is completely ignored.

On my board, there's a row of pins with a tiny plastic jumper cap connecting them. The cap was on the "1" side (3.3V). The chip was dutifully booting into the factory bootloader every single time, finding my custom interrupt vectors incomprehensible, and crashing into a HardFault.

The fix is to move the cap to the "0" side. But at the time, I didn't have the right jumper, and I wasn't even sure that was the problem yet. So I tried something else.

## Running code from RAM because Flash was locked out

If the chip won't read from Flash, what if I put the code somewhere it *will* read from? The STM32F407 has 128KB of SRAM starting at address `0x20000000`. That's more than enough for a small program.

I wrote a custom linker script that puts everything — the vector table, the program code, the string constants, the variables — into RAM:

```text
MEMORY
{
  RAM (xrw) : ORIGIN = 0x20000000, LENGTH = 128K
}

SECTIONS
{
  .isr_vector : { KEEP(*(.isr_vector)) } >RAM
  .text       : { *(.text) *(.text*) }   >RAM
  .rodata     : { *(.rodata) *(.rodata*)} >RAM
  .data       : { *(.data) *(.data*) }   >RAM
  .bss        : { *(.bss) *(.bss*) }     >RAM
}
```

Normally the linker script says `>FLASH` for code and `>RAM` for variables. I changed every section to `>RAM`. That's it. The linker doesn't care where you put things — it just follows the map you give it.

But there was a catch. The CPU's interrupt vector table is normally at `0x08000000` (the start of Flash). If an interrupt fires while we're running from RAM, the CPU will look for the handler at the Flash address, find garbage, and crash. I had to tell the CPU that the vector table had moved:

```c
SCB->VTOR = 0x20000000;
```

`SCB->VTOR` is the Vector Table Offset Register. Writing `0x20000000` to it tells the CPU: "the interrupt handlers are in RAM now, not Flash."

Then I used OpenOCD to manually inject the compiled binary into RAM and force the CPU to start executing from there. I had to find the exact address of the `Reset_Handler` function in the binary:

```
arm-none-eabi-nm build/Debug/led_blink.elf | grep Reset_Handler
```

This gave me `20006b80`. On ARM Cortex-M chips, function addresses need to have the lowest bit set to 1 to indicate Thumb mode, so the actual resume address is `0x20006b81`:

```
openocd -f openocd.cfg -c "init; reset halt; \
  load_image build/Debug/led_blink.elf; \
  resume 0x20006b81"
```

The LED started blinking. Code was running from RAM.

The trade-off is that RAM is volatile. Unplug the board and the program disappears. I had to reload it every time. But it worked, and it let me keep developing while I figured out the jumper situation.

## The LED that wasn't where the code said it was

Even after getting code to run, the LED wasn't blinking. I halted the CPU again and found it was sitting inside `HAL_Delay` — which meant the code was running fine, it just wasn't toggling the right pin.

The CubeMX-generated code was toggling `PA6` and `PA7`. But on this particular clone board, the user LED is connected to `PE0`. I found this by searching the board's documentation on STM32-base.org, which listed:

```
User LED → Connected to PE0 → Mode: Sink
```

I changed the GPIO pin in the code, recompiled, and the LED finally started blinking. A reminder that generic STM32 tutorials assume a specific board layout, and clone boards have their own pin assignments.

## The dead crystal

The CubeMX-generated `SystemClock_Config()` function was configured to use the HSE (High Speed External) oscillator — an 8MHz crystal on the board that gets multiplied up to 168MHz by the PLL. On my clone board, this crystal either wasn't installed correctly or was dead. The clock initialization code hung forever waiting for the crystal to stabilize.

I switched to the HSI (High Speed Internal) oscillator, which is a 16MHz RC oscillator built directly into the chip silicon. It's slightly less accurate than a crystal, but it's always available and can't be broken by bad soldering:

```c
RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSI;
RCC_OscInitStruct.HSIState = RCC_HSI_ON;
RCC_OscInitStruct.PLL.PLLSource = RCC_PLLSOURCE_HSI;
```

This is a common problem with cheap clone boards. If your clock init is hanging, try switching to HSI before debugging anything else.

## No serial port, no problem (semihosting)

I wanted to see `printf` output from the board. The normal approach is USB CDC (a virtual serial port over USB), but on this board it didn't work. No `/dev/ttyACM0` appeared. The board doesn't have the VBUS sensing hardware that USB CDC needs, and the clone ST-Link doesn't support USB passthrough.

So I used semihosting instead. Semihosting is an ARM debugging feature where `printf` calls get intercepted by the CPU, which pauses itself, sends the string through the SWD debug wires to OpenOCD on the PC, and then resumes. The text appears in your OpenOCD terminal. It's slow — each `printf` pauses the CPU for several milliseconds — but it works with nothing but the four SWD wires you already have connected.

Setting it up required changes in three places. In the CMakeLists.txt, I linked against the semihosting library:

```cmake
target_link_options(${PROJECT_NAME} PRIVATE
    "--specs=rdimon.specs" "-lrdimon" "-u" "_printf_float")
```

In the code, I initialized the semihosting file descriptors before the first `printf`:

```c
extern void initialise_monitor_handles(void);

int main(void) {
    initialise_monitor_handles();
    printf("Hello from the STM32!\n");
}
```

And in the OpenOCD command, I added `arm semihosting enable` before resuming the CPU. Without that, the CPU would hit the semihosting breakpoint instruction and crash because nothing was listening on the other end.

One gotcha: linking `rdimon` and enabling float printf ballooned the binary from 1.2KB to 35.8KB. On a chip with 1MB of Flash that's nothing, but it's worth knowing.

## Finding the sensor

The BME280 can sit at I2C address `0x76` or `0x77` depending on how its SDO pin is wired. I didn't know which one mine was, so I wrote a quick scan:

```c
if (HAL_I2C_IsDeviceReady(&hi2c1, (0x76 << 1), 3, 100) == HAL_OK) {
    printf("Found sensor at 0x76!\n");
} else if (HAL_I2C_IsDeviceReady(&hi2c1, (0x77 << 1), 3, 100) == HAL_OK) {
    printf("Found sensor at 0x77!\n");
}
```

The `<< 1` is because I2C uses 7-bit addresses, but the HAL function wants an 8-bit value with the read/write bit at position 0. Shifting left by one makes room for it. My sensor turned up at `0x76`.

Another problem: the BME280 driver I was using only accepted chip ID `0x58` (which is actually the BMP280, a pressure-only variant). My actual BME280 reports chip ID `0x60`. I had to change the check to accept both values. The sensor data was also showing up empty because the linker wasn't including float formatting support for `printf` — that's what the `-u _printf_float` flag fixed.

## Ditching HAL and going bare-metal

At this point I had everything working with ST's HAL library. The sensor was reading, the LED was blinking, semihosting was printing. But I realized I didn't actually understand what was happening. HAL calls like `HAL_I2C_Master_Transmit` hide everything behind a function call. If the bus locked up, I'd have no idea why.

So I rewrote the entire I2C communication using raw register access. No HAL. No CMSIS convenience macros. Just direct memory addresses and bitwise operations.

The first thing you learn when doing this is that every peripheral on the STM32 is controlled by registers — 32-bit values at specific memory addresses. Each bit in a register controls a specific hardware behavior. To turn on GPIO Port B, you write a `1` to bit 1 of the register at address `0x40023830`:

```c
#define RCC_AHB1ENR (*(volatile uint32_t *)(0x40023800 + 0x30))
RCC_AHB1ENR |= (1UL << 1);
```

The `|=` is critical here. If you used `=` instead, you'd overwrite all 32 bits, turning off every other peripheral that was previously enabled. The `|=` (bitwise OR assignment) only turns on the bit you specified and leaves everything else alone. It took me accidentally killing my I2C peripheral with a plain `=` to learn this lesson properly.

Configuring the I2C pins requires setting them to Alternate Function mode, Open-Drain output type, and connecting them to the I2C1 peripheral through the alternate function multiplexer. I2C uses Open-Drain because multiple devices share the same wire — if one device drives the line high while another pulls it low, you'd get a short circuit in push-pull mode. Open-Drain means devices can only pull the line to ground or release it, and an external pull-up resistor brings it back to 3.3V.

The actual I2C conversation is a sequence of register writes and flag checks. You generate a START condition by setting bit 8 of `I2C1_CR1`, then wait for the hardware to confirm it by checking bit 0 of `I2C1_SR1`. You send the slave address by writing to `I2C1_DR`, then wait for the address acknowledge flag. And so on through the entire read sequence:

```c
I2C1_CR1 |= (1UL << 8);              // START
while (!(I2C1_SR1 & (1UL << 0)));    // Wait for SB flag

I2C1_DR = 0xEC;                       // Address 0x76 + WRITE
while (!(I2C1_SR1 & (1UL << 1)));    // Wait for ADDR flag
temp_clear = I2C1_SR1;                // Clear ADDR by reading SR1
temp_clear = I2C1_SR2;                // then SR2

I2C1_DR = 0xFA;                       // Temperature register
while (!(I2C1_SR1 & (1UL << 7)));    // Wait for TXE flag
```

Every one of those `while` loops is waiting for a physical event on the wire. If the sensor isn't connected, or the pull-up resistors are missing, the flag never gets set and the CPU spins forever. I learned this the hard way when I forgot to wire the pull-ups and the program just froze silently. A multimeter on the SDA line showed it floating at random voltages — the STM32 was trying to talk but nobody was pulling the line back up.

## The FPU that crashes before main()

One more thing caught me off guard. I compiled with `-mfloat-abi=hard` to use the Cortex-M4's hardware floating point unit for the sensor math. The program crashed immediately — not in my code, but in the startup assembly, before `main()` was even called.

The reason: the ARM Cortex-M4 FPU is disabled by default on reset. If the compiled binary contains any floating-point instruction (and with hard float ABI, it will), the CPU faults immediately because the FPU coprocessors are locked. You have to enable them manually by writing to the Coprocessor Access Control Register:

```c
void SystemInit(void) {
    volatile uint32_t *CPACR = (volatile uint32_t *)0xE000ED88;
    *CPACR |= ((3UL << 20) | (3UL << 22));
    __asm volatile("dsb sy");
    __asm volatile("isb sy");
}
```

HAL does this for you in its startup code, which is why you never notice it when using the library. Going bare-metal means you're responsible for every piece of hardware initialization that the chip needs.

## The payoff

After fixing the jumper, rewriting the linker script, switching the clock source, setting up semihosting, hunting down the sensor address, rewriting the I2C driver from scratch, and unlocking the FPU, I finally got this in my terminal:

```
Bare-Metal BME280 I2C Monitor Started!
Raw Temp: MSB=0x7F LSB=0xAC (Combined: 32684)
Raw Temp: MSB=0x7F LSB=0xB0 (Combined: 32688)
Raw Temp: MSB=0x7F LSB=0xB4 (Combined: 32692)
```

Real data. From a real sensor. Through a hand-written register-level I2C driver. Streaming over debug wires into my terminal. The LED on PE0 was pulsing a steady heartbeat to confirm the loop was running.

It wasn't fast — semihosting pauses the CPU on every print. It wasn't pretty — raw register values instead of calibrated temperatures. But it was mine. Every byte traveled through code I understood completely, through hardware paths I could trace with a multimeter, through a build system I configured from scratch.

## What I'd do differently

If I were starting over, I'd check the BOOT0 jumper first. That single plastic cap cost me more time than everything else combined. I'd also start with the internal HSI clock instead of assuming the external crystal works — on clone boards, always assume the worst about any component you didn't solder yourself.

And I'd add timeout counters to every register flag check from the beginning. Bare-metal `while(!(flag))` loops are clean and simple, but when the hardware doesn't respond, they turn into silent infinite loops that are incredibly hard to debug. A simple decrementing counter that prints a diagnostic message after 100,000 iterations would have saved me hours of staring at a frozen terminal wondering if the code was even running.

The code for this project is at `~/Areas/Academics/stm32/stm32cube/led_blink` on my machine. Next up: wiring an op-amp to the STM32's ADC and seeing if I can build something that measures analog signals. The register-level understanding I built this week should make that a lot less mysterious.
