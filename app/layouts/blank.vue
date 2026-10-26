<template>
  <!DOCTYPE html><html class="scroll-smooth" lang="es" style=""><head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0" name="viewport">
<title>AFCOOP - Sistema de Gestión de Procesos</title>
<!-- Tailwind CSS CDN with plugins -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<!-- Google Fonts: Plus Jakarta Sans & Inter -->
<link href="https://fonts.googleapis.com" rel="preconnect">
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
<!-- Font Awesome Icons -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
<!-- Tailwind Configuration -->
<script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              navy: '#1A3673',
              dark: '#0f224b',
              blue: '#0284c7',
              teal: '#007953',
              green: '#00845a',
              emerald: '#059669',
              gold: '#F59E0B',
              surface: '#F8FAFC',
              card: '#FFFFFF'
            }
          },
          fontFamily: {
            sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
          },
          boxShadow: {
            'soft': '0 8px 30px rgba(0, 0, 0, 0.04)',
            'elevated': '0 20px 40px -15px rgba(26, 54, 115, 0.12)',
            'card': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
          }
        }
      }
    }
  </script>
<!-- BEGIN: Custom Layout & Animation Styles -->
<style data-purpose="custom-styling">
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: #F8FAFC;
      color: #1e293b;
    }
    
    /* Tricolor subtle bar */
    .bolivia-accent-bar {
      height: 3.5px;
      background: linear-gradient(90deg, #d8232a 0%, #d8232a 33.3%, #f8cf1c 33.3%, #f8cf1c 66.6%, #007934 66.6%, #007934 100%);
    }

    /* Carousel track & animations */
    .slide-item {
      transition: opacity 0.4s ease-in-out, transform 0.4s ease-in-out;
    }
    .carousel-dot {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .carousel-dot.active {
      width: 1.75rem;
      background-color: #1A3673;
    }
  </style>
<!-- END: Custom Layout & Animation Styles -->
</head>
<body class="antialiased min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
<!-- Tricolor Flag Accent line at top -->
<div class="bolivia-accent-bar w-full fixed top-0 z-50"></div>
<!-- BEGIN: Header Desktop -->
<header class="sticky top-0 bg-white/95 backdrop-blur-md z-40 border-b border-slate-200/80 shadow-xs" data-purpose="top-navigation">
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
<!-- Left: Official Branding using DATA:IMAGE:IMAGE_3 and IMAGE_4 -->
<a class="flex items-center gap-3 md:gap-4 group" href="#">
<img alt="AFCOOP Logo" class="h-12 w-auto object-contain transition-transform group-hover:scale-105 duration-200" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYJsXRg4dXJy_Bbfbgd9f4vHqpdlU_W-RbIr-qQEf-yLVEbEhXQO0P2QWUbvYLYPULFkoD53JRyVoMQwTbALB52QCuoU7iyushBGo9j5AzIq369yjJAtjJnamr8naVVW8BxUJJa1VxPP72xWflxaq0L2cWMpDutqtDxut9tLs8R-q_YrJtKYp1Ow56aPQbEyokfsui7maqA_U9CGgRbs8Bo45TzITdrwJj0n9joNnSCHx_l_nk9B3A">


</a>
<!-- Center: Navigation Menu -->

<!-- Right: Direct CTA Login button -->
<div class="flex items-center gap-3">
<a class="inline-flex items-center gap-2 text-sm font-bold text-white bg-brand-green hover:bg-[#016f4c] active:scale-95 px-5 py-2.5 rounded-lg shadow-sm transition-all duration-150" href="#login">
<i class="fa-solid fa-arrow-right-to-bracket text-xs"></i>
<span class="">Ingresar al sistema</span>
</a>
</div>
</div>
</header>
<!-- END: Header Desktop -->
<main class="flex-1">
<!-- BEGIN: Hero Section (2-Column Desktop Inspired by Reference Image 5) -->
<section class="relative pt-10 pb-16 lg:pt-16 lg:pb-24 overflow-hidden bg-gradient-to-b from-white via-slate-50/60 to-slate-100/40" data-purpose="hero-section" id="inicio">
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
<div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
<!-- Column 1: Left Welcome & CTAs -->
<div class="lg:col-span-6 flex flex-col items-start pr-0 lg:pr-4">
<!-- Institutional Pill Badge -->
<div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-brand-green text-xs font-bold tracking-wide uppercase mb-6 shadow-2xs">
<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              GESTIÓN INSTITUCIONAL &amp; TRANSPARENCIA
            </div>
<!-- Main Title with Distinct Brand Styling -->
<h1 class="text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight text-slate-900 leading-[1.12] mb-6">
              Bienvenidos al <br>
<span class="text-brand-green">Sistema de</span> <br>
<span class="text-brand-navy">Gestión de Procesos</span>
</h1>
<!-- Subtitle Description -->
<p class="text-base sm:text-lg text-slate-600 leading-relaxed font-normal mb-8 max-w-xl">
              Plataforma oficial de la <strong class="text-slate-900 font-semibold">AFCOOP</strong> diseñada para optimizar los flujos de trabajo, trámites cooperativos, correspondencia oficial y archivo digital con máxima agilidad, seguridad y transparencia.
            </p>
<!-- Action Buttons -->
<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-8">
<a class="inline-flex items-center justify-center gap-2.5 bg-brand-navy hover:bg-brand-dark text-white text-sm font-bold py-3.5 px-7 rounded-xl shadow-lg shadow-brand-navy/20 active:scale-[0.98] transition-all" href="#login">
<span class="">Ingresar al sistema</span>
<i class="fa-solid fa-circle-arrow-right text-xs"></i>
</a>
<a class="inline-flex items-center justify-center gap-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-sm font-semibold py-3.5 px-6 rounded-xl shadow-xs active:scale-[0.98] transition" href="#guia">
<i class="fa-solid fa-circle-question text-brand-navy/70 text-base"></i>
<span class="">Guía de usuario</span>
</a>
</div>
<!-- Emblem Quick Info Pill -->
<div class="flex items-center gap-3 p-3 bg-white/90 border border-slate-200/80 rounded-xl shadow-2xs max-w-md">
<div class="w-10 h-10 rounded-lg bg-emerald-50 text-brand-green flex items-center justify-center shrink-0 text-base font-bold">
<i class="fa-solid fa-shield-halved"></i>
</div>
<p class="text-xs text-slate-600 font-medium">
                Supervisión y regulación legal del Movimiento Cooperativo del Estado Plurinacional de Bolivia.
              </p>
</div>
</div>
<!-- Column 2: Right Interactive Module Carousel (Style mirroring Reference Image 5 Blue Feature Card) -->
<div class="lg:col-span-6 relative" id="modulos">
<!-- Carousel Container Card with rounded corners and rich institutional depth -->
<div class="relative bg-gradient-to-br from-[#0c5c8a] via-[#104870] to-[#0d2f4d] text-white rounded-3xl p-6 sm:p-9 shadow-elevated border-4 border-white/70 overflow-hidden min-h-[460px] flex flex-col justify-between">
<!-- Subtle decorative watermark / circular accent -->
<div class="absolute -right-16 -top-16 w-64 h-64 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none"></div>
<div class="absolute -left-12 -bottom-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
<!-- Top Carousel Header Bar with Module Counter & Arrows -->
<div class="flex items-center justify-between z-10 mb-4">
<span class="text-xs font-extrabold uppercase tracking-widest text-cyan-200 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  MÓDULOS DEL SISTEMA
                </span>
<!-- Nav Buttons -->
<div class="flex items-center space-x-2">
<button aria-label="Slide anterior" class="w-9 h-9 rounded-full bg-white/20 hover:bg-white text-white hover:text-brand-navy flex items-center justify-center transition active:scale-90 border border-white/20 shadow-sm" id="heroPrevBtn">
<i class="fa-solid fa-chevron-left text-xs"></i>
</button>
<button aria-label="Siguiente slide" class="w-9 h-9 rounded-full bg-white/20 hover:bg-white text-white hover:text-brand-navy flex items-center justify-center transition active:scale-90 border border-white/20 shadow-sm" id="heroNextBtn">
<i class="fa-solid fa-chevron-right text-xs"></i>
</button>
</div>
</div>
<!-- Carousel Slide Container (Slides dynamic) -->
<div class="relative flex-1 flex flex-col justify-center items-center my-4 z-10 text-center" id="heroSlidesTrack">
<!-- Slide 1: Trámites -->
<div class="hero-slide w-full flex-col items-center justify-center transition-all duration-500 flex" data-slide="0">
<div class="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 p-1 flex items-center justify-center shadow-lg mb-6 ring-8 ring-white/10">
<div class="w-full h-full rounded-full bg-[#0a3556] flex items-center justify-center text-4xl sm:text-5xl text-cyan-300">
<i class="fa-solid fa-users-gear"></i>
</div>
</div>
<span class="text-xs font-bold text-cyan-300 tracking-wider uppercase mb-1.5 bg-cyan-900/40 px-3 py-0.5 rounded-full border border-cyan-500/30">Módulo 01 • Digitalización 100%</span>
<h3 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white mb-3 max-w-md">
                    Trámites Cooperativos
                  </h3>
<p class="text-sm sm:text-base text-cyan-100 max-w-md leading-relaxed">
                    Registro, homologación y validación ágil de personerías jurídicas, asambleas y expedientes en tiempo real.
                  </p>
</div>
<!-- Slide 2: Correspondencia (Initially Hidden) -->
<div class="hero-slide w-full flex-col items-center justify-center transition-all duration-500 hidden" data-slide="1">
<div class="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 p-1 flex items-center justify-center shadow-lg mb-6 ring-8 ring-white/10">
<div class="w-full h-full rounded-full bg-[#06392b] flex items-center justify-center text-4xl sm:text-5xl text-emerald-300">
<i class="fa-solid fa-envelopes-bulk"></i>
</div>
</div>
<span class="text-xs font-bold text-emerald-300 tracking-wider uppercase mb-1.5 bg-emerald-900/40 px-3 py-0.5 rounded-full border border-emerald-500/30">Módulo 02 • Trazabilidad Total</span>
<h3 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white mb-3 max-w-md">
                    Correspondencia &amp; Hoja de Ruta
                  </h3>
<p class="text-sm sm:text-base text-cyan-100 max-w-md leading-relaxed">
                    Enrutamiento inteligente de correspondencia externa e interna con seguimiento de plazos y asignación de tareas inmediatas.
                  </p>
</div>
<!-- Slide 3: Archivo Digital (Initially Hidden) -->
<div class="hero-slide w-full flex-col items-center justify-center transition-all duration-500 hidden" data-slide="2">
<div class="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 p-1 flex items-center justify-center shadow-lg mb-6 ring-8 ring-white/10">
<div class="w-full h-full rounded-full bg-[#3d2407] flex items-center justify-center text-4xl sm:text-5xl text-amber-300">
<i class="fa-solid fa-box-archive"></i>
</div>
</div>
<span class="text-xs font-bold text-amber-300 tracking-wider uppercase mb-1.5 bg-amber-900/40 px-3 py-0.5 rounded-full border border-amber-500/30">Módulo 03 • Despapelización</span>
<h3 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white mb-3 max-w-md">
                    Archivo Digital Centralizado
                  </h3>
<p class="text-sm sm:text-base text-cyan-100 max-w-md leading-relaxed">
                    Custodia documental normada, expedientes indexados por cooperativa y consulta inmediata con valor jurídico.
                  </p>
</div>
</div>
<!-- Carousel Indicators (Dots) & Bottom Bar -->
<div class="flex items-center justify-between pt-4 border-t border-white/15 z-10">
<div class="flex items-center gap-2" id="heroDots">
<button aria-label="Ir a slide 1" class="w-8 h-2 rounded-full bg-white transition-all duration-300" data-index="0"></button>
<button aria-label="Ir a slide 2" class="w-2.5 h-2 rounded-full bg-white/40 hover:bg-white/70 transition-all duration-300" data-index="1"></button>
<button aria-label="Ir a slide 3" class="w-2.5 h-2 rounded-full bg-white/40 hover:bg-white/70 transition-all duration-300" data-index="2"></button>
</div>
<a class="text-xs font-bold text-cyan-200 hover:text-white flex items-center gap-1.5 transition" href="#servicios">
<span class="">Conocer flujos</span>
<i class="fa-solid fa-arrow-right text-[10px]"></i>
</a>
</div>
</div>
</div>
</div>
</div>
</section>
<!-- END: Hero Section -->
<!-- BEGIN: Digital Services Section (Desktop Grid inspired by Reference Image 5) -->

<!-- END: Digital Services Section -->
<!-- BEGIN: Institutional Mission Section (Desktop 2-Column Split inspired by Reference Image 5) -->

<!-- END: Institutional Mission Section -->
</main>
<!-- BEGIN: Footer Desktop (Clean, aligned to Reference Image 5) -->
<footer class="bg-white border-t border-slate-200 py-10" data-purpose="institutional-footer" id="contacto">
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
<!-- Top Row: Logo & Links -->
<div class="flex flex-col md:flex-row items-center justify-between pb-8 border-b border-slate-100 gap-6">
<!-- Left: Brand / Entity Logo -->
<div class="flex items-center gap-3">
<img alt="AFCOOP" class="h-10 w-auto object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYJsXRg4dXJy_Bbfbgd9f4vHqpdlU_W-RbIr-qQEf-yLVEbEhXQO0P2QWUbvYLYPULFkoD53JRyVoMQwTbALB52QCuoU7iyushBGo9j5AzIq369yjJAtjJnamr8naVVW8BxUJJa1VxPP72xWflxaq0L2cWMpDutqtDxut9tLs8R-q_YrJtKYp1Ow56aPQbEyokfsui7maqA_U9CGgRbs8Bo45TzITdrwJj0n9joNnSCHx_l_nk9B3A">
<div>
<h4 class="text-sm font-bold text-slate-900 leading-none">AFCOOP</h4>
<p class="text-[11px] text-slate-500 mt-1">Autoridad de Fiscalización y Control de Cooperativas</p>
</div>
</div>
<!-- Center: Links -->
<div class="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
<a class="hover:text-brand-navy transition" href="#privacidad">Privacidad</a>
<a class="hover:text-brand-navy transition" href="#terminos">Términos de Uso</a>
<a class="hover:text-brand-navy transition" href="#accesibilidad">Accesibilidad</a>
<a class="hover:text-brand-navy transition" href="#servicios">Mesa de Ayuda</a>
</div>
<!-- Right: Social / Contact Actions -->
<div class="flex items-center gap-2">
<a aria-label="Correo de contacto" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-brand-navy flex items-center justify-center text-xs transition" href="mailto:contacto@afcoop.gob.bo">
<i class="fa-solid fa-envelope"></i>
</a>
<a aria-label="Compartir" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-brand-navy flex items-center justify-center text-xs transition" href="#">
<i class="fa-solid fa-share-nodes"></i>
</a>
<a aria-label="Teléfono" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-brand-navy flex items-center justify-center text-xs transition" href="#">
<i class="fa-solid fa-phone"></i>
</a>
</div>
</div>
<!-- Bottom Row: Copyright & Legal text -->
<div class="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 text-center sm:text-left">
<p class="">© 2025 AFCOOP — Sistema de Gestión de Procesos. Todos los derechos reservados.</p>
<p class="">Bajo tuición del Ministerio de Trabajo, Empleo y Previsión Social — La Paz, Bolivia.</p>
</div>
</div>
</footer>
<!-- END: Footer Desktop -->
<!-- BEGIN: Interactive Carousel Script -->
<script data-purpose="desktop-carousel-interactivity">
    document.addEventListener('DOMContentLoaded', () => {
      const slides = document.querySelectorAll('.hero-slide');
      const dots = document.querySelectorAll('#heroDots button');
      const prevBtn = document.getElementById('heroPrevBtn');
      const nextBtn = document.getElementById('heroNextBtn');
      let currentIndex = 0;
      let autoPlayInterval = null;

      function showSlide(index) {
        if (index < 0) {
          currentIndex = slides.length - 1;
        } else if (index >= slides.length) {
          currentIndex = 0;
        } else {
          currentIndex = index;
        }

        slides.forEach((slide, i) => {
          if (i === currentIndex) {
            slide.classList.remove('hidden');
            slide.classList.add('flex');
          } else {
            slide.classList.add('hidden');
            slide.classList.remove('flex');
          }
        });

        dots.forEach((dot, i) => {
          if (i === currentIndex) {
            dot.className = 'w-8 h-2 rounded-full bg-white transition-all duration-300';
          } else {
            dot.className = 'w-2.5 h-2 rounded-full bg-white/40 hover:bg-white/70 transition-all duration-300';
          }
        });
      }

      function nextSlide() {
        showSlide(currentIndex + 1);
      }

      function prevSlide() {
        showSlide(currentIndex - 1);
      }

      if (nextBtn && prevBtn) {
        nextBtn.addEventListener('click', () => {
          nextSlide();
          resetAutoPlay();
        });

        prevBtn.addEventListener('click', () => {
          prevSlide();
          resetAutoPlay();
        });
      }

      dots.forEach(dot => {
        dot.addEventListener('click', () => {
          const idx = parseInt(dot.getAttribute('data-index') || '0', 10);
          showSlide(idx);
          resetAutoPlay();
        });
      });

      function startAutoPlay() {
        autoPlayInterval = setInterval(nextSlide, 5000);
      }

      function resetAutoPlay() {
        if (autoPlayInterval) {
          clearInterval(autoPlayInterval);
          startAutoPlay();
        }
      }

      startAutoPlay();
    });
  </script>
<!-- END: Interactive Carousel Script -->


</body></html>
</template>
