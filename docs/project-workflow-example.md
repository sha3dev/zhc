# Flujo de Trabajo de Proyectos

Este documento muestra el flujo completo de creación y ejecución de proyectos en el sistema de agentes jerárquico.

## Resumen del Flujo

1. **Humano crea proyecto** → Estado: `draft`
2. **CEO analiza y genera plan de ejecución** → Estado: `planning` → `ready`
3. **CEO crea documentación en repositorio** (archivos `.md`)
4. **Tareas se ejecutan en orden** → Estado: `in_progress`
5. **Todas las tareas completadas** → Estado: `completed`

## Convenciones de Nombres

**Importante**: Todos los prefijos de columnas en la base de datos están en MAYÚSCULAS:
- `AGN_id`, `AGN_name` (tabla agent)
- `PRJ_id`, `PRJ_name` (tabla project)
- `TSK_id`, `TSK_title` (tabla task)
- `TDP_TSK_id` (tabla task_dependency)

## Ejemplo Completo

### 1. Humano Crea Proyecto

```typescript
import { projectService } from '../services/project.service.js';

const project = await projectService.createProject({
  name: 'Website Corporativa',
  description: 'Crear website corporativa con estilo neobrutalism para empresa tech',
  createdBy: 'user-123',
});

// Resultado:
// {
//   id: 1,
//   name: 'Website Corporativa',
//   description: 'Crear website corporativa...',
//   status: 'draft',
//   createdBy: 'user-123',
//   ceo: undefined,
//   tasks: [],
//   createdAt: 2026-04-04T10:00:00Z,
//   updatedAt: 2026-04-04T10:00:00Z
// }
```

### 2. CEO Genera Plan de Ejecución

El CEO analiza la petición del humano y genera un plan detallado.

**Primero, el CEO crea la documentación en el repositorio:**

```bash
# CEO crea archivos en el repo:
docs/
├── guidelines/
│   └── neobrutalism-design.md
├── architecture/
│   └── tech-stack.md
└── context/
    └── project-overview.md
```

**Luego, genera el plan de ejecución en la base de datos:**

```typescript
const executionPlan: ExecutionPlan = {
  projectId: 1,
  rationale: `
    El proyecto requiere desarrollo frontend con estética neobrutalista.
    Divido en 5 tareas especializadas que pueden ejecutarse en paralelo
    cuando sea posible.

    He creado documentación en:
    - docs/guidelines/neobrutalism-design.md
    - docs/architecture/tech-stack.md
    - docs/context/project-overview.md
  `,
  tasks: [
    {
      projectId: 1,
      assignedToAgentId: 5, // Frontend Developer Agent
      title: 'Configurar estructura del proyecto Next.js',
      description: `
# Tarea: Configurar Next.js

Crear un proyecto Next.js 14 con App Router:

1. Inicializar proyecto: \`npx create-next-app@latest\`
2. Configurar TypeScript estricto
3. Instalar dependencias: tailwindcss, framer-motion
4. Crear estructura de carpetas base:
   - src/components (componentes reutilizables)
   - src/app (páginas y layouts)
   - src/styles (estilos globales)
5. Configurar Tailwind con colores neobrutalistas

NO necesitas conocer el resto del proyecto.
Para más contexto, consulta: docs/architecture/tech-stack.md

Entrega: Repositorio con estructura base configurada.
      `,
      dependsOnTaskIds: [],
      sortOrder: 1,
      documentationReference: 'docs/architecture/tech-stack.md',
    },
    {
      projectId: 1,
      assignedToAgentId: 6, // UI Designer Agent
      title: 'Diseñar sistema de diseño neobrutalista',
      description: `
# Tarea: Sistema de Diseño

Crear un sistema de diseño en estilo neobrutalista:

## Componentes a Diseñar:

1. **Botones**
   - Borde negro 3px sólido
   - Somb dura negra 4px
   - Hover: translate(2px, 2px), sombra 2px
   - Colores: negro, blanco, amarillo (#FFFF00), rojo (#FF0000)

2. **Tarjetas**
   - Fondo blanco o colores primarios
   - Borde negro grueso
   - Sombra dura visible
   - Tipografía bold

3. **Tipografía**
   - Títulos: Space Grotesk o similar (bold, 700+)
   - Cuerpo: Inter o similar (regular, 400-600)
   - Tamaños: H1 (4rem), H2 (3rem), H3 (2rem), Body (1rem)

4. **Colores Globales**
   - Primario: #000000 (negro)
   - Secundario: #FFFFFF (blanco)
   - Acento: #FFFF00 (amarillo)
   - Error: #FF0000 (rojo)

5. **Espaciado**
   - Unidades de 8px (8, 16, 24, 32, 48...)
   - Padding generoso en componentes

**IMPORTANTE**: Lee las guidelines completas en:
docs/guidelines/neobrutalism-design.md

Entrega: Archivo Figma o Storybook con todos los componentes.
      `,
      dependsOnTaskIds: [],
      sortOrder: 2,
      documentationReference: 'docs/guidelines/neobrutalism-design.md',
    },
    {
      projectId: 1,
      assignedToAgentId: 7, // Frontend Developer Agent
      title: 'Implementar página principal',
      description: `
# Tarea: Homepage

Implementar la página principal del sitio:

## Contenido:
1. **Hero Section**
   - Título grande en Space Grotesk bold
   - Subtítulo descriptivo
   - CTA button con estilo neobrutalista
   - Layout asimétrico con elementos geométricos

2. **Features Section**
   - Grid de 3 columnas
   - Tarjetas con bordes gruesos y sombras duras
   - Iconos simples y crudos

3. **About Section**
   - Layout asimétrico (texto izquierda, imagen derecha)
   - Bordes visibles entre secciones

## Requisitos:
- Usa el sistema de diseño proporcionado (revisa docs/guidelines/neobrutalism-design.md)
- Responsive (mobile-first)
- Animaciones sutiles con Framer Motion
- Optimizado para SEO

NO necesitas saber el contexto general del proyecto.
Toda la información necesaria está en las docs referenciadas.

Entrega: Página / implementada en Next.js.
      `,
      dependsOnTaskIds: [0, 1], // Depende de tareas 0 y 1 (configuración y diseño)
      sortOrder: 3,
      documentationReference: 'docs/guidelines/neobrutalism-design.md',
    },
    {
      projectId: 1,
      assignedToAgentId: 8, // Content Writer Agent
      title: 'Redactar copy y contenido',
      description: `
# Tarea: Copywriting

Crear contenido para la página:

## Secciones a Redactar:

1. **Hero Section**
   - Headline: Máximo 10 palabras, impactante
   - Subheadline: Máximo 20 palabras, descriptivo
   - CTA: "Empezar" o "Contactar"

2. **Features**
   - 3 features principales
   - Título + descripción por feature
   - Máximo 30 palabras por feature

3. **About**
   - Historia de la empresa
   - 100-150 palabras
   - Ton: profesional pero con personalidad

## Estilo:
- Directo y conciso
- Sin jerga técnico
- Enfocado en beneficios
- Pequeñas frases impactantes (neobrutalism)

Contexto del proyecto: docs/context/project-overview.md

Entrega: Documento con todo el copy organizado por sección.
      `,
      dependsOnTaskIds: [],
      sortOrder: 4,
      documentationReference: 'docs/context/project-overview.md',
    },
    {
      projectId: 1,
      assignedToAgentId: 7, // Frontend Developer Agent
      title: 'Integrar contenido y deploy final',
      description: `
# Tarea: Integración y Deploy

Integrar todo el contenido y hacer deploy:

## Tareas:
1. Integrar copy en todos los componentes
2. Revisar responsive en todos los dispositivos
3. Optimizar imágenes y assets
4. Configurar metadatos SEO
5. Testing manual de todas las páginas
6. Deploy en Vercel
7. Configurar dominio personalizado

## Checklist de Calidad:
- [ ] Lighthouse score > 90
- [ ] Sin errores de consola
- [ ] Todas las animaciones funcionan
- [ ] Responsive correcto
- [ ] SEO metadatos completos

Stack: docs/architecture/tech-stack.md

Entrega: Sitio deployed y funcional en Vercel.
      `,
      dependsOnTaskIds: [2, 3], // Depende de página principal y copy
      sortOrder: 5,
      documentationReference: 'docs/architecture/tech-stack.md',
    },
  ],
};

// Generar el plan de ejecución
const updatedProject = await projectService.generateExecutionPlan(1, executionPlan);
```

### 3. Ejecutar Tareas

Una vez el plan está listo (`status: 'ready'`), las tareas pueden ejecutarse:

```typescript
// Obtener tareas que pueden empezar (dependencias resueltas)
const nextTasks = await projectService.getNextTasks(1);
// Retorna: Tareas 0, 1, y 3 (no tienen dependencias)

// Iniciar tarea 0 (Configurar Next.js)
await projectService.startTask(0, 5); // Task ID, Agent ID

// Completar tarea 0
await projectService.completeTask(0);

// Ahora se pueden iniciar tareas que dependen de 0
const nextTasks2 = await projectService.getNextTasks(1);
// Retorna: Tareas 1 y 3 (2 depende de 0 y 1)

// Iniciar tarea 1 (Diseñar sistema)
await projectService.startTask(1, 6);
await projectService.completeTask(1);

// Ahora tarea 2 está disponible
const nextTasks3 = await projectService.getNextTasks(1);
// Retorna: Tareas 2 y 3

// ... y así sucesivamente hasta completar todas
```

### 4. Estado Final del Proyecto

```typescript
const finalProject = await projectService.getProjectWithTasks(1);

// Resultado:
{
  id: 1,
  name: 'Website Corporativa',
  description: 'Crear website corporativa...',
  status: 'completed', // ✅ Todas las tareas completadas
  createdBy: 'user-123',
  ceo: { id: 1, name: 'CEO Agent' },
  tasks: [
    { id: 0, title: 'Configurar estructura...', status: 'completed', ... },
    { id: 1, title: 'Diseñar sistema...', status: 'completed', ... },
    { id: 2, title: 'Implementar página...', status: 'completed', ... },
    { id: 3, title: 'Redactar copy...', status: 'completed', ... },
    { id: 4, title: 'Integrar y deploy...', status: 'completed', ... }
  ],
  createdAt: 2026-04-04T10:00:00Z,
  updatedAt: 2026-04-04T14:30:00Z
}
```

## Puntos Clave

1. **Descripciones de Tareas Claras**: Cada tarea tiene toda la información que necesita el agente asignado. No necesita conocer el resto del proyecto.

2. **Documentación en Repositorio**: El CEO crea archivos `.md` en el repo (ej: `docs/guidelines/neobrutalism-design.md`). Las tareas hacen referencia a estos archivos por nombre.

3. **Dependencias**: Las tareas pueden depender de otras. El sistema automáticamente determina qué tareas pueden ejecutarse.

4. **Asignación de Agentes**: Cada tarea se asigna a un agente específico con la especialización adecuada.

5. **Estados del Proyecto**:
   - `draft`: Recién creado por el humano
   - `planning`: CEO está generando el plan
   - `ready`: Plan generado, listo para ejecutar
   - `in_progress`: Hay tareas en ejecución
   - `completed`: Todas las tareas completadas
   - `on_hold`: Proyecto pausado
   - `cancelled`: Proyecto cancelado

6. **Estados de Tarea**:
   - `pending`: Esperando poder ejecutarse
   - `assigned`: Asignada a un agente
   - `in_progress`: Agente está trabajando
   - `completed`: Finalizada con éxito
   - `failed`: Falló
   - `blocked`: Bloqueada por dependencias
   - `cancelled`: Cancelada

## Estructura de Archivos del Repositorio

```
project-repo/
├── docs/
│   ├── guidelines/
│   │   └── neobrutalism-design.md      # Referenciado en tareas 1, 2
│   ├── architecture/
│   │   └── tech-stack.md               # Referenciado en tareas 0, 4
│   └── context/
│       └── project-overview.md         # Referenciado en tarea 3
├── src/
│   ├── components/
│   ├── app/
│   └── styles/
└── package.json
```

## Convenciones de Base de Datos

Recuerda: **Todos los prefijos de columnas van en MAYÚSCULAS**

```sql
-- Tabla agent
AGN_id, AGN_name, AGN_soul, AGN_model, AGN_reports_to_AGN_id

-- Tabla project
PRJ_id, PRJ_name, PRJ_description, PRJ_status, PRJ_created_by, PRJ_ceo_AGN_id

-- Tabla task
TSK_id, TSK_PRJ_id, TSK_assigned_to_AGN_id, TSK_title, TSK_description,
TSK_status, TSK_sort_order, TSK_doc_reference

-- Tabla task_dependency
TDP_id, TDP_TSK_id, TDP_depends_on_TSK_id
```
