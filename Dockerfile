# Usa la imagen oficial de Node.js (versión ligera) como base
FROM node:20-alpine AS builder

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de configuración
COPY package.json package-lock.json ./

# Instala las dependencias
RUN npm ci

# Copia el resto del código
COPY . .

# Construye la aplicación Nuxt
RUN npm run build

# --- Etapa de producción ---
FROM node:20-alpine

WORKDIR /app

# Copia solo los archivos necesarios de la etapa de construcción (.output es generado por Nuxt/Nitro)
COPY --from=builder /app/.output /app/.output

# Expone el puerto (3000 por defecto en Nuxt)
EXPOSE 3000

# Variables de entorno
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

# Inicia la aplicación
CMD ["node", ".output/server/index.mjs"]
