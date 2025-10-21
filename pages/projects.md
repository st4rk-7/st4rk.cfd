---
title: Projects - Sanjeew Shewon
display: Projects
description: List of projects that I am proud of
wrapperClass: 'text-center'
art: dots
projects:
  Embedded Systems:
    - name: 'Kaizen-07'
      link: 'https://github.com/st4rk-7/Kaizen-07'
      desc: 'C++ firmware for a two-wheeled self-balancing robot with PID control & IMU sensor fusion.'
      icon: 'i-carbon-bot'
    - name: 'Firmware Dev'
      link: 'https://github.com/st4rk-7'
      desc: 'Replace with your firmware project'
      icon: 'i-carbon-code'

  Hardware & Electronics:
    - name: 'PCB Design'
      link: 'https://github.com/st4rk-7'
      desc: 'Replace with your PCB/hardware project'
      icon: 'i-carbon-assembly-cluster'
    - name: 'Circuit Design'
      link: 'https://github.com/st4rk-7'
      desc: 'Replace with your circuit design project'
      icon: 'i-carbon-flash'

  Software & Tools:
    - name: 'NeuralNetwork'
      link: 'https://github.com/st4rk-7/NeuralNetwork'
      desc: 'Neural Network built from scratch in C++'
      icon: 'i-carbon-machine-learning-model'
    - name: 'CLI Tool'
      link: 'https://github.com/st4rk-7'
      desc: 'Replace with your tool/utility project'
      icon: 'i-carbon-terminal'
---

<!-- @layout-full-width -->
<ListProjects :projects="frontmatter.projects" />
