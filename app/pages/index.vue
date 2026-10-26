<script setup lang="ts">
definePageMeta({
  layout: 'wellcome',
})

useHead({
  title: 'AFCOOP — Sistema de Gestión de Procesos',
})

const { isAuthenticated } = useAuth()
const postLoginPath = '/dashboard'

interface ModuloSlide {
  id: number
  tag: string
  titulo: string
  descripcion: string
  icon: string
  ring: string
  badge: string
  iconWrap: string
}

const modulos: ModuloSlide[] = [
  {
    id: 0,
    tag: 'Módulo 01 • Digitalización 100%',
    titulo: 'Trámites Cooperativos',
    descripcion:
      'Registro trámites de Legalización',
    icon: 'i-lucide-users-round',
    ring: 'from-info-400 to-primary-500',
    badge: 'text-info-300 bg-info-950/40 border-info-500/30',
    iconWrap: 'bg-info-950 text-info-300',
  },
  {
    id: 1,
    tag: 'Módulo 02 • Trazabilidad Total',
    titulo: 'Correspondencia & Hoja de Ruta',
    descripcion:
      'Enrutamiento inteligente de correspondencia externa e interna con seguimiento de plazos y asignación de tareas inmediatas.',
    icon: 'i-lucide-mail',
    ring: 'from-success-400 to-success-600',
    badge: 'text-success-300 bg-success-950/40 border-success-500/30',
    iconWrap: 'bg-success-950 text-success-300',
  },
  {
    id: 2,
    tag: 'Módulo 03 • Despapelización',
    titulo: 'Archivo Digital Centralizado',
    descripcion:
      'Generación de archivo documental indexado.',
    icon: 'i-lucide-archive',
    ring: 'from-warning-400 to-warning-600',
    badge: 'text-warning-300 bg-warning-950/40 border-warning-500/30',
    iconWrap: 'bg-warning-950 text-warning-300',
  },
]

const slideActivo = ref(0)
let autoPlayTimer: ReturnType<typeof setInterval> | null = null

function mostrarSlide(index: number) {
  if (index < 0) slideActivo.value = modulos.length - 1
  else if (index >= modulos.length) slideActivo.value = 0
  else slideActivo.value = index
}

function reiniciarAutoPlay() {
  if (autoPlayTimer) clearInterval(autoPlayTimer)
  autoPlayTimer = setInterval(() => mostrarSlide(slideActivo.value + 1), 5000)
}

function ingresar() {
  if (isAuthenticated.value) {
    navigateTo(postLoginPath)
    return
  }
  if (import.meta.client) {
    const redirectUri = `${window.location.origin}${postLoginPath}`
    const nuxtApp = useNuxtApp() as {
      $keycloak?: { login: (o: { redirectUri: string }) => void }
    }
    nuxtApp.$keycloak?.login({ redirectUri })
  }
}

onMounted(() => {
  if (isAuthenticated.value) {
    navigateTo(postLoginPath)
    return
  }
  reiniciarAutoPlay()
})

onUnmounted(() => {
  if (autoPlayTimer) clearInterval(autoPlayTimer)
})

const ingresarLabel = computed(() =>
  isAuthenticated.value ? 'Ir al sistema' : 'Ingresar al sistema',
)

const slideActual = computed(() => modulos[slideActivo.value])
</script>

<template>
  <section
    id="inicio"
    class="relative overflow-hidden bg-gradient-to-b from-default via-muted/30 to-muted/60 pt-10 pb-16 lg:pt-16 lg:pb-24"
  >
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
        <div class="flex flex-col items-start lg:col-span-6 lg:pr-4">
          <UBadge
            color="success"
            variant="subtle"
            size="md"
            class="mb-6 uppercase tracking-wide"
          >
            <span class="mr-2 inline-block size-2 animate-pulse rounded-full bg-success-500" />
            Gestión institucional &amp; transparencia
          </UBadge>

          <h1
            class="mb-6 text-4xl leading-[1.12] font-extrabold tracking-tight text-highlighted sm:text-5xl lg:text-[56px]"
          >
            Bienvenidos al
            <br>
            <span class="text-success-600 dark:text-success-400">Sistema de</span>
            <br>
            <span class="text-primary-700 dark:text-primary-400">Gestión de Procesos</span>
          </h1>

          <p class="mb-8 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Plataforma oficial integradora de los procesos de gestión de la
            <strong class="font-semibold text-highlighted">AFCOOP</strong>
            diseñada para optimizar los flujos de trabajo, trámites legalizaciones, Informeción Financiera y correspondencia
            oficial y archivo digital con máxima agilidad, seguridad y transparencia.
          </p>

          <div class="mb-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <UButton
              :label="ingresarLabel"
              icon="i-lucide-arrow-right"
              size="lg"
              color="primary"
              class="font-bold"
              @click="ingresar"
            />
            <UButton
              label="Guía de usuario"
              icon="i-lucide-circle-help"
              size="lg"
              color="neutral"
              variant="outline"
              to="#modulos"
            />
          </div>

          <UCard
            variant="subtle"
            class="max-w-md"
            :ui="{ body: 'flex items-center gap-3 p-3' }"
          >
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-md bg-success-500/10 text-success-600 dark:text-success-400"
            >
              <UIcon name="i-lucide-shield-check" class="size-5" />
            </div>
            <p class="text-xs font-medium text-muted">
              Supervisión y regulación legal del Movimiento Cooperativo del Estado Plurinacional de
              Bolivia.
            </p>
          </UCard>
        </div>

        <div id="modulos" class="relative lg:col-span-6">
          <UCard
            class="relative flex min-h-[460px] flex-col justify-between overflow-hidden border-4 border-default/80 bg-gradient-to-br from-primary-800 via-primary-900 to-primary-950 text-inverted shadow-lg"
            :ui="{ body: 'flex flex-1 flex-col justify-between p-6 sm:p-9' }"
          >
            <div
              class="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-info-400/10 blur-2xl"
            />
            <div
              class="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full bg-success-500/10 blur-xl"
            />

            <div class="relative z-10 mb-4 flex items-center justify-between">
              <UBadge
                color="info"
                variant="subtle"
                size="sm"
                class="uppercase tracking-widest"
              >
                Módulos del sistema
              </UBadge>
              <div class="flex items-center gap-2">
                <UButton
                  icon="i-lucide-chevron-left"
                  color="neutral"
                  variant="soft"
                  size="sm"
                  square
                  aria-label="Slide anterior"
                  class="text-inverted"
                  @click="mostrarSlide(slideActivo - 1); reiniciarAutoPlay()"
                />
                <UButton
                  icon="i-lucide-chevron-right"
                  color="neutral"
                  variant="soft"
                  size="sm"
                  square
                  aria-label="Siguiente slide"
                  class="text-inverted"
                  @click="mostrarSlide(slideActivo + 1); reiniciarAutoPlay()"
                />
              </div>
            </div>

            <div class="relative z-10 my-4 flex flex-1 flex-col items-center justify-center text-center">
              <Transition name="welcome-slide" mode="out-in">
                <div
                  :key="slideActivo"
                  class="flex w-full flex-col items-center justify-center"
                >
                  <div
                    class="mb-6 flex size-28 items-center justify-center rounded-full bg-gradient-to-tr p-1 shadow-lg ring-8 ring-white/10 sm:size-32"
                    :class="slideActual.ring"
                  >
                    <div
                      class="flex size-full items-center justify-center rounded-full"
                      :class="slideActual.iconWrap"
                    >
                      <UIcon :name="slideActual.icon" class="size-12 sm:size-14" />
                    </div>
                  </div>
                  <span
                    class="mb-1.5 rounded-full border px-3 py-0.5 text-xs font-bold tracking-wider uppercase"
                    :class="slideActual.badge"
                  >
                    {{ slideActual.tag }}
                  </span>
                  <h3 class="mb-3 max-w-md text-2xl font-extrabold tracking-tight uppercase sm:text-3xl">
                    {{ slideActual.titulo }}
                  </h3>
                  <p class="max-w-md text-sm leading-relaxed text-info-100 sm:text-base">
                    {{ slideActual.descripcion }}
                  </p>
                </div>
              </Transition>
            </div>

            <div class="relative z-10 flex items-center justify-between border-t border-white/15 pt-4">
              <div class="flex items-center gap-2">
                <button
                  v-for="mod in modulos"
                  :key="mod.id"
                  type="button"
                  :aria-label="`Ir a slide ${mod.id + 1}`"
                  class="h-2 rounded-full transition-all duration-300"
                  :class="
                    slideActivo === mod.id
                      ? 'w-8 bg-inverted'
                      : 'w-2.5 bg-inverted/40 hover:bg-inverted/70'
                  "
                  @click="mostrarSlide(mod.id); reiniciarAutoPlay()"
                />
              </div>
              <UButton
                to="#modulos"
                variant="link"
                color="info"
                size="xs"
                trailing-icon="i-lucide-arrow-right"
                label="Conocer flujos"
                class="text-info-200"
              />
            </div>
          </UCard>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.welcome-slide-enter-active,
.welcome-slide-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.welcome-slide-enter-from,
.welcome-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
