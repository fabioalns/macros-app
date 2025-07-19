Gestor de Macros MédicosEsta es una aplicación web estática simple para gestionar una colección de macros o plantillas de texto médico. Permite visualizar, copiar, añadir, editar, eliminar, buscar, importar y exportar macros.CaracterísticasVisualización Jerárquica: Macros organizados por categoría → subcategoría.Copia Rápida: Botón para copiar el contenido de cualquier macro al portapapeles con un solo clic.Gestión sin Código (CRUD): Añade, edita y elimina macros a través de una interfaz de usuario modal.Persistencia Local: Todos los cambios se guardan en el localStorage del navegador, por lo que tus datos persisten entre sesiones.Búsqueda Global: Busca macros por título o contenido en tiempo real.Importar/Exportar: Descarga todos tus macros a un archivo JSON de respaldo o importa macros desde un archivo.Diseño Moderno: Interfaz limpia, responsiva (mobile-first) y con modo oscuro automático.Sin Dependencias: Creado con HTML, CSS y JavaScript vanilla. No requiere frameworks ni librerías externas.Accesibilidad: Atajos de teclado (Ctrl+K para buscar) y uso de roles ARIA para una mejor navegación.¿Cómo usarlo?Despliegue LocalDescarga los archivos: Guarda los siguientes archivos en una misma carpeta en tu ordenador:index.htmlstyles.cssapp.jsmacros.jsonAbre el archivo principal: Haz doble clic en index.html para abrirlo en tu navegador web preferido (Google Chrome, Mozilla Firefox, Microsoft Edge, etc.).¡Eso es todo! La aplicación se cargará y estará lista para usar. La primera vez, cargará los datos de ejemplo del archivo macros.json. Cualquier cambio que realices se guardará automáticamente en el almacenamiento local de tu navegador.Despliegue en un Servidor EstáticoPuedes alojar estos archivos en cualquier servicio de hosting estático como GitHub Pages, Netlify, Vercel, etc. Simplemente sube los cuatro archivos a la raíz de tu proyecto.Estructura de DatosLos macros se almacenan en un formato JSON específico. Cada objeto en el array principal representa un grupo de macros que comparten una categoría y subcategoría.[
  {
    "category": "Nombre de la Categoría",
    "subCategory": "Nombre de la Subcategoría",
    "items": [
      {
        "id": "un_id_unico_autogenerado",
        "title": "Título del Macro",
        "content": "Contenido completo del macro, que puede incluir\nsaltos de línea."
      }
    ]
  }
]
