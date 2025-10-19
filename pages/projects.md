---
title: Projects - Sanjeew Shewon
display: Projects
description: List of projects that I am proud of
wrapperClass: 'text-center'
art: dots
projects:
  Embedded Systems:
    - name: 'Project Template'
      link: 'https://github.com/st4rk-7'
      desc: 'Replace with your embedded systems project'
      icon: 'i-carbon-chip'
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
    - name: 'Web Project'
      link: 'https://github.com/st4rk-7'
      desc: 'Replace with your web/software project'
      icon: 'i-carbon-application-web'
    - name: 'CLI Tool'
      link: 'https://github.com/st4rk-7'
      desc: 'Replace with your tool/utility project'
      icon: 'i-carbon-terminal'
---

<!-- @layout-full-width -->
<ListProjects :projects="frontmatter.projects" />
