export const PAGE_SCHEMAS = {
  global: {
    label: 'Configuración general',
    description: 'Identidad, navegación, contacto, redes, pie de página y SEO general.',
    groups: [
      { label: 'Identidad', fields: [
        { key: 'siteName', label: 'Nombre del sitio', type: 'text', default: 'Life Deco Art' },
        { key: 'logoUrl', label: 'Logo', type: 'image', aspect: '3/1' },
        { key: 'faviconUrl', label: 'Favicon', type: 'image', aspect: '1/1' },
        { key: 'defaultShareImageUrl', label: 'Imagen predeterminada para compartir', type: 'image', aspect: '1.91/1' },
      ]},
      { label: 'Contacto', fields: [
        { key: 'phoneDisplay', label: 'Teléfono visible', type: 'text', default: '+1 849-539-0410' },
        { key: 'whatsappNumber', label: 'Número de WhatsApp (solo números)', type: 'text', default: '18495390410' },
        { key: 'email', label: 'Correo', type: 'text', default: 'hola@lifedecoart.com' },
        { key: 'facebookUrl', label: 'Facebook', type: 'url', default: 'https://web.facebook.com/lifedecoart/' },
        { key: 'instagramUrl', label: 'Instagram', type: 'url', default: 'https://www.instagram.com/lifedecoart' },
        { key: 'tiktokUrl', label: 'TikTok', type: 'url', default: 'https://www.tiktok.com/@lifedecoart' },
        { key: 'pinterestUrl', label: 'Pinterest', type: 'url', default: 'https://www.pinterest.com/lifedecoart/' },
      ]},
      { label: 'Navegación', fields: [
        { key: 'navInicio', label: 'Etiqueta: Inicio', type: 'text', default: 'Inicio' },
        { key: 'navSobreMi', label: 'Etiqueta: Sobre Mí', type: 'text', default: 'Sobre Mí' },
        { key: 'navTienda', label: 'Etiqueta: Tienda', type: 'text', default: 'Tienda' },
        { key: 'navAprende', label: 'Etiqueta: Aprende', type: 'text', default: 'Aprende' },
        { key: 'navContacto', label: 'Etiqueta: Contacto', type: 'text', default: 'Contacto' },
      ]},
      { label: 'Pie de página', fields: [
        { key: 'footerTitle', label: 'Frase principal', type: 'textarea', default: 'Letras BONITAS y con propósito.' },
        { key: 'footerNewsletterText', label: 'Texto de comunidad', type: 'textarea', default: 'Ideas y novedades directo a tu correo.' },
        { key: 'footerNewsletterPlaceholder', label: 'Texto del campo de correo', type: 'text', default: 'Tu email' },
        { key: 'footerNewsletterButton', label: 'Botón de suscripción', type: 'text', default: 'Unirme' },
        { key: 'affiliateNotice', label: 'Aviso de afiliados', type: 'textarea', default: 'Algunos enlaces son de afiliado.' },
      ]},
      { label: 'SEO general', fields: [
        { key: 'defaultSeoTitle', label: 'Título predeterminado', type: 'text', default: 'Life Deco Art' },
        { key: 'defaultSeoDescription', label: 'Descripción predeterminada', type: 'textarea' },
      ]},
    ]
  },
  inicio: {
    label: 'Inicio', description: 'Todos los textos, imágenes, video, secciones y llamadas a la acción de Inicio.',
    groups: [
      { label: 'Portada', fields: [
        { key: 'heroEyebrow', label: 'Texto superior', type: 'text' },
        { key: 'heroTitlePre', label: 'Título antes de la palabra manuscrita', type: 'text', default: 'La evolución de una' },
        { key: 'heroTitleCursive', label: 'Palabra manuscrita', type: 'text', default: 'idea' },
        { key: 'heroSubtitle', label: 'Subtítulo', type: 'textarea', default: 'Convierto momentos importantes: una boda, un cumpleaños, un “gracias”, en piezas atemporales.' },
        { key: 'heroVideoUrl', label: 'Video de portada', type: 'video' },
        { key: 'heroImageUrl', label: 'Imagen alternativa de portada', type: 'image', aspect: '16/9' },
        { key: 'heroPrimaryLabel', label: 'Botón principal', type: 'text' },
        { key: 'heroPrimaryHref', label: 'Enlace del botón principal', type: 'url' },
        { key: 'heroSecondaryLabel', label: 'Botón secundario', type: 'text' },
        { key: 'heroSecondaryHref', label: 'Enlace del botón secundario', type: 'url' },
      ]},
      { label: 'Presentación', fields: [
        { key: 'aboutEyebrow', label: 'Texto superior', type: 'text' },
        { key: 'aboutTitle', label: 'Título', type: 'textarea' },
        { key: 'aboutText', label: 'Texto', type: 'richtext' },
        { key: 'melaniPhotoUrl', label: 'Melani en su estudio', type: 'image', aspect: '4/5' },
      ]},
      { label: 'Servicios', fields: [
        { key: 'servicesEyebrow', label: 'Texto superior', type: 'text' },
        { key: 'servicesTitle', label: 'Título', type: 'text' },
        { key: 'servicesSubtitle', label: 'Subtítulo', type: 'textarea' },
        { key: 'servPersonalizadosUrl', label: 'Imagen: Personalizados', type: 'image', aspect: '4/5' },
        { key: 'servRotulacionUrl', label: 'Imagen: Rotulación', type: 'image', aspect: '4/5' },
        { key: 'servPackagingUrl', label: 'Imagen: Packaging', type: 'image', aspect: '4/5' },
        { key: 'servSouvenirsUrl', label: 'Imagen: Souvenirs', type: 'image', aspect: '4/5' },
      ]},
      { label: 'Cómo funciona', fields: [
        { key: 'processTitle', label: 'Título', type: 'text' },
        { key: 'processSubtitle', label: 'Subtítulo', type: 'textarea' },
        { key: 'cwCuentameUrl', label: 'Imagen: Cuéntame', type: 'image', aspect: '16/9' },
        { key: 'cwBocetoUrl', label: 'Imagen: Boceto', type: 'image', aspect: '16/9' },
        { key: 'cwTrazoUrl', label: 'Imagen: Trazo', type: 'image', aspect: '16/9' },
        { key: 'cwFinalUrl', label: 'Imagen: Entrega final', type: 'image', aspect: '16/9' },
      ]},
      { label: 'Piezas destacadas', fields: [
        { key: 'piecesTitle', label: 'Título', type: 'text' },
        { key: 'pieza1Url', label: 'Pieza 1', type: 'image', aspect: '1/1' },
        { key: 'pieza2Url', label: 'Pieza 2', type: 'image', aspect: '1/1' },
        { key: 'pieza3Url', label: 'Pieza 3', type: 'image', aspect: '1/1' },
        { key: 'pieza4Url', label: 'Pieza 4', type: 'image', aspect: '1/1' },
      ]},
      { label: 'Testimonio y taller', fields: [
        { key: 'testimonialQuote', label: 'Testimonio', type: 'textarea', default: '“La bandeja quedó preciosa, mi mamá lloró al verla.”' },
        { key: 'testimonialAuthor', label: 'Autor del testimonio', type: 'text', default: 'Carolina Reyes · pieza personalizada' },
        { key: 'courseSpotlightTitle', label: 'Título del taller destacado', type: 'text' },
        { key: 'courseSpotlightText', label: 'Texto del taller destacado', type: 'textarea' },
        { key: 'cursoSpotlightUrl', label: 'Imagen del taller destacado', type: 'image', aspect: '16/9' },
      ]},
      { label: 'Cierre', fields: [
        { key: 'closingTitle', label: 'Título', type: 'text', default: '¿Hacemos algo increíble juntos?' },
        { key: 'closingText', label: 'Texto', type: 'textarea', default: 'Ya sea para una marca, un rincón especial o una gran celebración; encontremos la forma de contar tu historia con belleza.' },
        { key: 'closingPrimaryLabel', label: 'Botón principal', type: 'text' },
        { key: 'closingPrimaryHref', label: 'Enlace principal', type: 'url' },
      ]},
      { label: 'SEO', fields: seoFields() },
    ]
  },
  sobremi: basicPage('Sobre mí', 'Historia, presentación, imágenes y cierre.', [
    ['heroTitle','Título principal','richtext'], ['heroQuote','Frase bajo el título','textarea'],
    ['introText','Primer párrafo','textarea'], ['discoveryText','Párrafo sobre el lettering','textarea'], ['storyText','Historia de la marca','textarea'],
    ['principleText','Principio de trabajo','textarea'], ['audienceText','Con quién trabajo','textarea'],
    ['servicesTitle','Título: qué hago','text'], ['serviceNames','Servicios (uno por línea)','lines'],
    ['processTitle','Título del proceso','text'], ['processIntro','Primer párrafo del proceso','textarea'], ['processText','Segundo párrafo del proceso','textarea'],
    ['featuredLabel','Etiqueta de fotografía destacada','text'], ['valuesTitle','Título de filosofía','text'], ['valuesText','Texto de filosofía','richtext'],
    ['testimonialsTitle','Título de testimonios','text'],
    ['testimonial1Quote','Testimonio 1','textarea'], ['testimonial1Author','Autor 1','text'],
    ['testimonial2Quote','Testimonio 2','textarea'], ['testimonial2Author','Autor 2','text'],
    ['testimonial3Quote','Testimonio 3','textarea'], ['testimonial3Author','Autor 3','text'],
    ['heroImageUrl','Foto principal','image','4/5'], ['featuredImageUrl','Foto del proceso','image','21/9'],
    ['closingTitle','Título de cierre','richtext'], ['closingText','Texto de cierre','textarea'],
    ['closingWhatsappLabel','Botón de WhatsApp','text'], ['closingEmailLabel','Botón de correo','text']
  ]),
  tienda: basicPage('Tienda', 'Portada, introducción, preguntas frecuentes y cierre de la tienda.', [
    ['heroTitle','Título principal','textarea'], ['heroSubtitle','Subtítulo','textarea'], ['bannerImageUrl','Banner','image','21/9'],
    ['faqTitle','Título de preguntas frecuentes','text'], ['faqSubtitle','Subtítulo de preguntas frecuentes','textarea'],
    ['closingTitle','Título de cierre','text'], ['closingText','Texto de cierre','textarea']
  ]),
  aprende: basicPage('Aprende', 'Configuración común de pestañas, textos, banners y cierre.', [
    ['heroTitle','Título general','text'], ['heroSubtitle','Subtítulo general','textarea'], ['communityTitle','Título de comunidad','text'],
    ['communityText','Texto de comunidad','textarea'], ['communityButton','Botón de comunidad','text'], ['affiliateNotice','Aviso de afiliados','textarea']
  ]),
  contacto: basicPage('Contacto', 'Textos, datos, opciones y mensajes del formulario.', [
    ['heroTitle','Título principal','text'], ['introText','Texto introductorio','textarea'], ['projectTypes','Tipos de proyecto (uno por línea)','lines'],
    ['nameLabel','Etiqueta: nombre','text'], ['emailLabel','Etiqueta: correo','text'], ['projectLabel','Etiqueta: tipo de proyecto','text'],
    ['messageLabel','Etiqueta: cuéntame tu idea','text'], ['submitLabel','Botón de envío','text'],
    ['successMessage','Mensaje de éxito','textarea'], ['errorMessage','Mensaje de error','textarea']
  ]),
  encargos: basicPage('Encargo personalizado', 'Textos, opciones e instrucciones del formulario de encargos.', [
    ['heroTitle','Título principal','text'], ['introText','Texto introductorio','textarea'], ['pieceTypes','Tipos de pieza (uno por línea)','lines'],
    ['budgetOptions','Opciones de presupuesto (una por línea)','lines'], ['occasionLabel','Etiqueta: ocasión','text'],
    ['dateLabel','Etiqueta: fecha','text'], ['quantityLabel','Etiqueta: cantidad','text'], ['sizeLabel','Etiqueta: tamaño','text'],
    ['customTextLabel','Etiqueta: texto a incluir','text'], ['colorsLabel','Etiqueta: colores o estilo','text'],
    ['budgetLabel','Etiqueta: presupuesto','text'], ['cityLabel','Etiqueta: ciudad','text'], ['referencesLabel','Etiqueta: referencias','text'],
    ['submitLabel','Texto del botón','text'], ['whatsappMessage','Plantilla del mensaje de WhatsApp','textarea']
  ]),
  privacidad: legalPage('Política de privacidad'),
  terminos: legalPage('Términos y condiciones'),
};

export const ENTITY_SCHEMAS = {
  categories: entity('Categorías', [['name','Nombre','text'],['subcategories','Subcategorías (una por línea)','lines'],['description','Descripción','textarea'],['imageUrl','Imagen','image','1/1'],['status','Estado','status'],['order','Orden','number'],['seoTitle','Título SEO','text'],['seoDescription','Descripción SEO','textarea']]),
  products: entity('Productos', [['name','Nombre','text'],['slug','Dirección','slug'],['status','Estado','status'],['price','Precio','text'],['category','Categoría','text'],['subcategory','Subcategoría','text'],['tag','Etiqueta','text'],['delivery','Tiempo de entrega','text'],['shortDescription','Descripción corta','textarea'],['description','Descripción completa','richtext'],['imageUrl','Foto principal','image','4/5'],['gallery','Galería','images','1/1'],['colors','Colores (uno por línea)','lines'],['sizes','Tamaños (uno por línea)','lines'],['includes','Qué incluye (uno por línea)','lines'],['excludes','Qué no incluye (uno por línea)','lines'],['instructions','Instrucciones de pedido','textarea'],['faqs','Preguntas frecuentes','faqs'],['relatedIds','Productos relacionados','relations'],['whatsappMessage','Mensaje de WhatsApp','textarea'],['order','Orden','number'],...seoTuple()]),
  courses: learningEntity('Cursos', [['level','Nivel / modalidad','text'],['duration','Duración','text'],['availability','Disponibilidad','text'],['modules','Temario / módulos','modules'],['materials','Materiales','textarea'],['audience','Para quién está pensado','textarea'],['paymentNote','Forma de pago','textarea'],['testimonials','Testimonios','testimonials']]),
  workshops: learningEntity('Talleres', [['date','Fecha','text'],['time','Hora','text'],['level','Nivel','text'],['location','Ubicación','text'],['capacity','Cupos / estado','text'],['mapImageUrl','Mapa o instrucciones visuales','image','16/9'],['locationDetail','Instrucciones de llegada','textarea'],['cancellationPolicy','Política de cancelación','textarea'],['pastGallery','Galería de talleres anteriores','images','1/1'],['modules','Programa de la sesión','modules'],['materials','Materiales','textarea']]),
  resources: entity('Recursos y PDF', [['title','Título','text'],['slug','Dirección','slug'],['status','Estado','status'],['format','Formato','text'],['description','Descripción','textarea'],['fileUrl','Documento adjunto','file'],['imageUrl','Portada','image','4/3'],['previewImages','Imágenes de vista previa','images','3/4'],['pageCount','Número de páginas','text'],['contains','Qué contiene (uno por línea)','lines'],['audience','Para quién está pensado','textarea'],['instructions','Cómo usarlo','textarea'],['relatedIds','Contenido relacionado','relations'],['order','Orden','number'],...seoTuple()]),
  posts: entity('Blog', [['title','Título','text'],['slug','Dirección','slug'],['status','Estado','status'],['category','Categoría','text'],['excerpt','Extracto','textarea'],['content','Contenido completo','richtext'],['publishedAt','Fecha de publicación','date'],['readingTime','Tiempo de lectura','text'],['imageUrl','Imagen principal','image','16/9'],['gallery','Imágenes del artículo','images','16/9'],['authorName','Nombre del autor','text'],['authorRole','Cargo del autor','text'],['authorPhoto','Foto del autor','image','1/1'],['relatedIds','Artículos relacionados','relations'],['order','Orden','number'],...seoTuple()]),
  essentials: entity('Esenciales y afiliados', [['name','Nombre','text'],['status','Estado','status'],['category','Categoría','text'],['description','Descripción','textarea'],['imageUrl','Foto','image','1/1'],['href','Enlace','url'],['affiliateNotice','Aviso de afiliado','textarea'],['order','Orden','number']]),
  communities: entity('Comunidad', [['name','Nombre','text'],['status','Estado','status'],['description','Descripción','richtext'],['imageUrl','Imagen','image','1/1'],['href','Enlace','url'],['benefits','Beneficios (uno por línea)','lines'],['order','Orden','number']]),
  services: entity('Servicios', [['name','Nombre','text'],['slug','Dirección','slug'],['status','Estado','status'],['shortDescription','Descripción corta','textarea'],['description','Descripción completa','richtext'],['imageUrl','Imagen principal','image','16/9'],['gallery','Galería','images','1/1'],['features','Características (una por línea)','lines'],['process','Proceso de trabajo','modules'],['priceNote','Información de precio','textarea'],['faqs','Preguntas frecuentes','faqs'],['whatsappMessage','Mensaje de WhatsApp','textarea'],['relatedIds','Servicios relacionados','relations'],['order','Orden','number'],...seoTuple()]),
};

function seoFields() {
  return [
    { key: 'seoTitle', label: 'Título SEO', type: 'text' },
    { key: 'seoDescription', label: 'Descripción SEO', type: 'textarea' },
    { key: 'shareImageUrl', label: 'Imagen para compartir', type: 'image', aspect: '1.91/1' },
    { key: 'searchVisibility', label: 'Visibilidad en buscadores', type: 'select', options: ['Indexar', 'No indexar'], default: 'Indexar' },
  ];
}

function seoTuple() {
  return [['seoTitle','Título SEO','text'],['seoDescription','Descripción SEO','textarea'],['shareImageUrl','Imagen para compartir','image','1.91/1'],['searchVisibility','Visibilidad en buscadores','select',null,['Indexar','No indexar']]];
}

function fieldsFromTuples(items) {
  return items.map(([key,label,type,aspect,options]) => ({ key, label, type, ...(aspect ? { aspect } : {}), ...(options ? { options } : {}) }));
}

function basicPage(label, description, items) {
  return { label, description, groups: [{ label: 'Contenido', fields: fieldsFromTuples(items) }, { label: 'SEO', fields: seoFields() }] };
}

function legalPage(label) {
  return basicPage(label, `Texto completo y fecha de actualización de ${label}.`, [
    ['title','Título','text'], ['updatedAtLabel','Fecha de última actualización','text'], ['intro','Introducción','textarea'], ['body','Secciones legales completas','richtext']
  ]);
}

function entity(label, tuples) {
  return { label, fields: fieldsFromTuples(tuples) };
}

function learningEntity(label, extra) {
  return entity(label, [
    ['name','Nombre','text'],['slug','Dirección','slug'],['status','Estado','status'],['price','Precio','text'],
    ['description','Descripción','richtext'],['imageUrl','Imagen principal','image','16/9'],['gallery','Galería','images','1/1'],
    ...extra,['faqs','Preguntas frecuentes','faqs'],['relatedIds','Contenido relacionado','relations'],
    ['whatsappMessage','Mensaje de WhatsApp','textarea'],['order','Orden','number'],...seoTuple()
  ]);
}

export function flattenPageFields(schema) {
  return (schema?.groups || []).flatMap((group) => group.fields.map((field) => ({ ...field, group: group.label })));
}

export function pageDefaults(schema) {
  return Object.fromEntries(flattenPageFields(schema).filter((field) => field.default !== undefined).map((field) => [field.key, field.default]));
}
