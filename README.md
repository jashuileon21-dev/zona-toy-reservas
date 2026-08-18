# Zona Toy · Sistema de Reservas V2

Reglas configuradas:

- Horario: **10:00 AM a 8:30 PM**
- Reserva mínima: **1 hora**
- Reserva máxima: **2 horas**
- Opciones actuales: **1 h, 1 h 30 min y 2 h**
- La cuadrícula avanza cada 30 minutos.
- La persona reserva **la máquina completa**.
- No hay pago por adelantado.
- El cliente no puede borrar, editar ni cancelar la reserva desde la web.
- Solo empleados autorizados pueden entrar al panel y modificar el estado.

## Conectar Supabase

1. Crea un proyecto en Supabase.
2. Ve a **SQL Editor**.
3. Ejecuta todo `schema.sql`.
4. Copia `Project URL` y la `Publishable/anon key`.
5. Pégalos en `supabase-config.js`.

Nunca pongas una `service_role key` en la web.

## Crear empleados

En **Authentication > Users > Add user**, crea un usuario por empleado.

Después copia su UUID y ejecuta:

```sql
insert into public.staff_users(user_id, display_name)
values ('UUID_DEL_USUARIO', 'Nombre del empleado');
```

## Cómo se bloquean los horarios

No se permite ningún traslape en la misma máquina.

Si alguien reserva LX de 5:00 PM a 7:00 PM:
- 4:30–5:30 queda bloqueado
- 5:00–6:00 queda bloqueado
- 5:30–7:30 queda bloqueado
- 6:00–8:00 queda bloqueado
- 7:00 PM vuelve a estar disponible como nueva hora de inicio

Phoenix 2 sigue siendo independiente de LX.

## Publicación

Puedes publicarlo en GitHub Pages, Netlify o Vercel.

## Siguientes mejoras útiles

- Vista semanal tipo calendario para empleados
- Bloquear horarios manualmente (torneos/mantenimiento)
- Botón directo de WhatsApp en cada reserva
- Folio de reserva
- CAPTCHA anti-spam
- Límite de reservas por teléfono
- Recordatorios por WhatsApp
