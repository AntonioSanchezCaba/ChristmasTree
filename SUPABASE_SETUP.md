# Configuración de Supabase - Límite de 3 Usuarios

Este documento explica cómo configurar Supabase para limitar el registro a solo 3 usuarios.

## ⚠️ IMPORTANTE: Debes ejecutar AMBOS pasos para que funcione correctamente

- **Paso 1**: Necesario para registro por email/contraseña
- **Paso 2**: Necesario para registro por OAuth (Google)

Si solo ejecutas el Paso 1, los usuarios aún podrán registrarse con Google. **Debes ejecutar ambos pasos.**

---

## Paso 1: Crear la función SQL para contar usuarios

Ve a tu proyecto de Supabase → **SQL Editor** → **New Query** y ejecuta el siguiente código:

```sql
-- Función para contar usuarios registrados
CREATE OR REPLACE FUNCTION count_registered_users()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM auth.users
  WHERE deleted_at IS NULL;

  RETURN user_count;
END;
$$;

-- Otorgar permisos a usuarios anónimos y autenticados
GRANT EXECUTE ON FUNCTION count_registered_users() TO anon;
GRANT EXECUTE ON FUNCTION count_registered_users() TO authenticated;
```

## Paso 2: Crear Database Webhook para OAuth (IMPORTANTE)

Para bloquear registros de OAuth (Google) que excedan el límite, necesitas crear un **Database Webhook**:

### Opción A: Usar Database Webhooks (Recomendado)

1. Ve a **Database** → **Webhooks** en tu proyecto de Supabase
2. Crea un nuevo Webhook con esta configuración:
   - **Name**: `block_excess_users`
   - **Table**: `auth.users`
   - **Events**: `INSERT`
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: Necesitas un endpoint que valide y elimine usuarios extras

### Opción B: Usar Database Trigger con Function (Más Simple)

Ejecuta este código SQL para crear un trigger que bloquee automáticamente:

```sql
-- Función que se ejecuta antes de insertar un nuevo usuario
CREATE OR REPLACE FUNCTION check_user_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Contar usuarios existentes
  SELECT COUNT(*) INTO current_count
  FROM auth.users
  WHERE deleted_at IS NULL;

  -- Si ya hay 3 o más usuarios, rechazar el nuevo registro
  IF current_count >= 3 THEN
    RAISE EXCEPTION 'User limit reached. Maximum 3 users allowed.';
  END IF;

  -- Si hay espacio, permitir el registro
  RETURN NEW;
END;
$$;

-- Crear trigger que se ejecuta ANTES de insertar un usuario
DROP TRIGGER IF EXISTS enforce_user_limit ON auth.users;
CREATE TRIGGER enforce_user_limit
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION check_user_limit();
```

## Paso 3: Verificar la configuración

Después de ejecutar el SQL:

1. Verifica que la función existe:
   ```sql
   SELECT count_registered_users();
   ```
   Debería devolver el número actual de usuarios.

2. Intenta registrar un 4to usuario - debe fallar con el mensaje:
   ```
   User limit reached. Maximum 3 users allowed.
   ```

## Paso 4: Manejo de errores en el cliente

El código del cliente (index.html) ya incluye el manejo de estos errores tanto para registro normal como OAuth.

## Notas importantes

- **Registro por Email**: La validación se hace en el cliente antes de llamar a `signUp()`
- **OAuth (Google)**: La validación se hace mediante el Database Trigger en Supabase
- **Usuarios existentes**: Los triggers NO afectan a usuarios ya registrados
- **Eliminación**: Si un usuario es eliminado (`deleted_at != NULL`), se libera un espacio

## Eliminar usuarios manualmente (si es necesario)

Si necesitas eliminar usuarios para hacer pruebas:

```sql
-- Ver todos los usuarios
SELECT id, email, created_at
FROM auth.users
WHERE deleted_at IS NULL;

-- Eliminar un usuario específico (reemplaza el email)
DELETE FROM auth.users
WHERE email = 'usuario@example.com';
```

## Desactivar el límite (si lo necesitas después)

```sql
-- Eliminar el trigger
DROP TRIGGER IF EXISTS enforce_user_limit ON auth.users;

-- Eliminar la función del trigger
DROP FUNCTION IF EXISTS check_user_limit();

-- Opcional: eliminar la función de conteo
DROP FUNCTION IF EXISTS count_registered_users();
```
