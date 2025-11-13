# Dockerfile para WLED Scheduler Service
FROM node:18-alpine

# Metadata
LABEL maintainer="AMSC"
LABEL description="Servicio autónomo para gestionar horarios de WLED Christmas Tree"

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY scheduler.js ./

# Configurar usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Exponer puerto (no necesario para MQTT client, pero útil para healthcheck futuro)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "console.log('OK')" || exit 1

# Comando de inicio
CMD ["node", "scheduler.js"]
