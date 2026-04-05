# Resumen del Modelo de Proyectos

## ✅ Cambios Completados

### 1. **Nomenclatura de Base de Datos**

Los prefijos son **MAYÚSCULAS** y **NO se repiten** en foreign keys:

```sql
-- Tablas
agent (AGN_)
project (PRJ_)
task (TSK_)
task_dependency (TDP_)

-- FK simples (usan el prefijo de la tabla referenciada)
task.PRJ_id          -- FK a project.PRJ_id
task.AGN_id          -- FK a agent.AGN_id
project.AGN_id       -- FK a agent.AGN_id (CEO)
task_dependency.TSK_id  -- FK a task.TSK_id

-- FK descriptivos (usan nombre descriptivo + prefijo)
agent.reports_to_AGN_id    -- FK a agent.AGN_id con nombre descriptivo
task_dependency.depends_on_TSK_id  -- FK a task.TSK_id con nombre descriptivo
```

### 2. **Eliminada `project_documentation`**

La documentación ahora son **archivos en el repositorio git**. Las tareas ya no tienen referencia a archivos en la DB, se menciona en la descripción si es necesario.

### 3. **Proyectos creados por Humanos**

```sql
-- Antes
PRJ_created_by_AGN_id  -- Creaba un agente

-- Ahora
PRJ_created_by  VARCHAR(255)  -- Identificador de humano
AGN_id          -- CEO agent asignado al proyecto
```

### 4. **Simplificación de Task**

```sql
-- Eliminado TSK_doc_reference (la doc está en el repo)
-- Renombrado TSK_sort_order → TSK_sort

CREATE TABLE task (
    TSK_id SERIAL PRIMARY KEY,
    PRJ_id INTEGER NOT NULL REFERENCES project(PRJ_id),
    AGN_id INTEGER REFERENCES agent(AGN_id),
    TSK_title VARCHAR(500) NOT NULL,
    TSK_description TEXT,
    TSK_status VARCHAR(50) DEFAULT 'pending',
    TSK_sort INTEGER DEFAULT 0,  -- ✅ Antes: TSK_sort_order
    TSK_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    TSK_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. **Modelo de Datos Final**

```
agent
├── AGN_id (PK)
├── AGN_name
├── AGN_soul
├── AGN_model
├── reports_to_AGN_id (FK → agent.AGN_id)
└── AGN_status

project
├── PRJ_id (PK)
├── PRJ_name
├── PRJ_description
├── PRJ_created_by (humano)
├── AGN_id (CEO agent)
└── PRJ_status

task
├── TSK_id (PK)
├── PRJ_id (FK → project)
├── AGN_id (FK → agent, assigned)
├── TSK_title
├── TSK_description (contexto completo, puede mencionar archivos de doc)
├── TSK_status
└── TSK_sort (orden de ejecución)

task_dependency (many-to-many)
├── TDP_id (PK)
├── TSK_id (FK → task)
└── depends_on_TSK_id (FK → task)
```

## Flujo de Trabajo

```typescript
// 1. Humano crea proyecto
const project = await projectService.createProject({
  name: 'Website Corporativa',
  description: 'Crear website con estilo neobrutalism',
  createdBy: 'user-123'
});

// 2. CEO crea documentación en el repo (archivos .md)
// CEO escribe: docs/guidelines/neobrutalism-design.md
// CEO escribe: docs/architecture/tech-stack.md

// 3. CEO genera plan de ejecución
await projectService.generateExecutionPlan(projectId, {
  rationale: "...",
  tasks: [
    {
      projectId: 1,
      assignedToAgentId: 5,
      title: "Configurar Next.js",
      description: `
# Tarea: Configurar Next.js

Crear un proyecto Next.js 14 con App Router.

Para más contexto sobre el stack técnico,
consulta: docs/architecture/tech-stack.md

Entrega: Repositorio con estructura base configurada.
      `,
      dependsOnTaskIds: [],
      sort: 1  // ✅ Antes: sortOrder
    },
    // ... más tareas
  ]
});

// 4. Ejecutar tareas
const nextTasks = await projectService.getNextTasks(projectId);
await projectService.startTask(taskId, agentId);
await projectService.completeTask(taskId);
```

## Estados

### Estados del Proyecto
- `draft` - Recién creado
- `planning` - CEO generando plan
- `ready` - Plan listo
- `in_progress` - Tareas ejecutándose
- `completed` - Todo completado
- `on_hold` - Pausado
- `cancelled` - Cancelado

### Estados de Tarea
- `pending` - Esperando
- `assigned` - Asignada
- `in_progress` - En ejecución
- `completed` - Completada
- `failed` - Falló
- `blocked` - Bloqueada
- `cancelled` - Cancelada

## Archivos Creados/Modificados

✅ `src/types/project.ts`
   - Eliminado `TSK_doc_reference`
   - Renombrado `TSK_sort_order` → `TSK_sort`
   - Eliminado `documentationReference` de DTOs
   - Renombrado `sortOrder` → `sort`

✅ `src/repositories/task.repository.ts`
   - Actualizadas todas las referencias
   - Eliminada columna `docReference`
   - Renombrada columna `sortOrder` → `sort`

✅ `scripts/migrations/003_update_project_task_tables.sql`
   - Eliminada columna `TSK_doc_reference`
   - Renombrada columna `TSK_sort_order` → `TSK_sort`

✅ `DATABASE_CONVENTIONS.md`
   - Ejemplos actualizados

## Estructura de Tipos

```typescript
// Entidad de base de datos
interface TaskEntity {
  TSK_id: number;
  PRJ_id: number;
  AGN_id: number | null;
  TSK_title: string;
  TSK_description: string;
  TSK_status: TaskStatus;
  TSK_sort: number;  // ✅ Simplificado
  TSK_created_at: Date;
  TSK_updated_at: Date;
}

// DTO para crear tarea
interface CreateTaskDTO {
  projectId: number;
  assignedToAgentId: number;
  title: string;
  description: string;
  dependsOnTaskIds: number[];
  sort: number;  // ✅ Sin documentationReference
}
```

## Próximos Pasos

1. ✅ Ejecutar migraciones en la base de datos
2. Crear agents especializados (Frontend Developer, UI Designer, etc.)
3. Implementar el flujo del CEO agent
4. Crear endpoints de API para projects/tasks
