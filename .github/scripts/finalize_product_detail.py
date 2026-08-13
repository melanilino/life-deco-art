from pathlib import Path

p = Path('Productos.dc.html')
s = p.read_text()

replacements = [
    ('<a href="/tienda" style="text-decoration:none;color:#8B795E;">Personalizados</a>', '<a href="/tienda" style="text-decoration:none;color:#8B795E;">{{ product.category }}</a>'),
    ('<a href="/tienda" style="text-decoration:none;color:#8B795E;">Bandejas</a>', '<a href="/tienda" style="text-decoration:none;color:#8B795E;">{{ product.subcategory }}</a>'),
    ('<span style="color:#000000;">Bandeja "Te Elijo Hoy"</span>', '<span style="color:#000000;">{{ product.name }}</span>'),
    ('        Bestseller', '        {{ product.tag }}'),
    ('<h1 style="font-size:{{ h1Size }};line-height:1.2;color:#000000;font-weight:300;margin:0 0 14px;">Bandeja "Te Elijo <span style="font-family:\'Homemade Apple\',cursive;font-weight:400;font-size:1.15em;">Hoy</span>"</h1>', '<h1 style="font-size:{{ h1Size }};line-height:1.2;color:#000000;font-weight:300;margin:0 0 14px;">{{ product.name }}</h1>'),
    ('<div style="font-size:22px;font-weight:500;color:#F65091;margin-bottom:18px;">RD$2,220</div>', '<div style="font-size:22px;font-weight:500;color:#F65091;margin-bottom:18px;">{{ product.price }}</div>'),
    ('<p style="font-size:14px;color:#2B2420;font-weight:300;line-height:1.7;margin:0 0 24px;">Bandeja de madera lacada en negro, con lettering blanco pintado a mano. Una pieza pensada para acompañar una propuesta, un aniversario o cualquier momento que merezca decir las cosas bonito.</p>', '<p style="font-size:14px;color:#2B2420;font-weight:300;line-height:1.7;margin:0 0 24px;">{{ product.desc }}</p>'),
    ('            Elaboración: 5-7 días', '            Elaboración: {{ product.delivery }}'),
    ('<div style="font-size:11px;color:#8B795E;font-weight:300;">Bandeja "Te Elijo Hoy"</div>', '<div style="font-size:11px;color:#8B795E;font-weight:300;">{{ product.name }}</div>'),
    ('<div style="font-size:15px;color:#F65091;font-weight:600;">RD$2,220</div>', '<div style="font-size:15px;color:#F65091;font-weight:600;">{{ product.price }}</div>'),
    ('<div style="font-size:14px;color:#000;font-weight:400;">{{ p.name }}</div>', '<a href="{{ p.href }}" style="display:block;font-size:14px;color:#000;font-weight:400;text-decoration:none;">{{ p.name }}</a>'),
]
for old, new in replacements:
    if old in s:
        s = s.replace(old, new, 1)

start = s.index('class Component extends DCLogic {')
end = s.index('</script>', start)
new_class = r'''class Component extends DCLogic {
  state = {
    isMobile: typeof window !== 'undefined' && window.innerWidth < 860,
    color: 'Negro', size: 'Mediana (25cm)', faqOpen: 0,
    product: null, allProducts: []
  };

  DEFAULT_PRODUCTS = [
    { id: 'p1', name: 'Bandeja "Te Elijo Hoy"', price: 'RD$2,220', category: 'Personalizados', subcategory: 'Bandejas', desc: 'Bandeja de madera lacada en negro, lettering blanco pintado a mano.', tag: 'Bestseller', delivery: '5-7 días', imageUrl: '' },
    { id: 'p2', name: 'Cuadro Personalizado 8x10', price: 'RD$700', category: 'Personalizados', subcategory: 'Cuadros', desc: 'Cuadro enmarcado en tela con frase inspiracional ilustrada a mano.', tag: '', delivery: '5-7 días', imageUrl: '' },
    { id: 'p3', name: 'Caja Sorpresa Personalizada', price: 'Próximamente', category: 'Personalizados', subcategory: 'Cajas', desc: 'Caja kraft con lazo de raso, diseñada a mano para anuncios especiales.', tag: 'Ed. Limitada', delivery: '5-7 días', imageUrl: '' },
    { id: 'p4', name: 'Letrero "Feliz Navidad"', price: 'RD$2,400', category: 'Ocasión', subcategory: 'Navidad', desc: 'Letrero redondo de madera pintado a mano con detalles navideños.', tag: 'Nuevo', delivery: '5-7 días', imageUrl: '' },
    { id: 'p5', name: 'Vinera Personalizada', price: 'RD$895', category: 'Personalizados', subcategory: 'Vineras', desc: 'Vinera de madera con nombre pintado a mano, ideal para regalar.', tag: '', delivery: '7-10 días', imageUrl: '' },
    { id: 'p6', name: 'Cartuchera Personalizada', price: 'RD$230', category: 'Personalizados', subcategory: 'Bolsos', desc: 'Cartuchera de lona con nombre en tipografía cursiva.', tag: '', delivery: '3-5 días', imageUrl: '' },
    { id: 'p7', name: 'Letrero de Nombre Colgante', price: 'RD$1,000', category: 'Personalizados', subcategory: 'Carteles', desc: 'Letrero de madera pintado a mano con nombre y flores.', tag: '', delivery: '5-7 días', imageUrl: '' },
    { id: 'p8', name: 'Llavero con Foto', price: 'RD$500', category: 'Personalizados', subcategory: 'Llaveros', desc: 'Llavero acrílico personalizado con tu fotografía favorita.', tag: '', delivery: '3-5 días', imageUrl: '' },
    { id: 'p9', name: 'Caja Recuerdo de Nacimiento', price: 'RD$1,870', category: 'Ocasión', subcategory: 'Bebés y Revelación', desc: 'Caja en resina con forma de corazón para ecografías y recuerdos del nacimiento.', tag: 'Bestseller', delivery: '7-10 días', imageUrl: '' },
    { id: 'p10', name: 'Cuadro de Hitos "One Month"', price: 'RD$500', category: 'Ocasión', subcategory: 'Bebés y Revelación', desc: 'Cuadro ilustrado a mano para conmemorar cada mes de vida del bebé.', tag: '', delivery: '5-7 días', imageUrl: '' },
    { id: 'p11', name: 'Cartel de Propuesta', price: 'RD$1,600', category: 'Ocasión', subcategory: 'Bodas', desc: 'Cartel en lienzo con flores pintadas a mano para inmortalizar el sí quiero.', tag: '', delivery: '7-10 días', imageUrl: '' }
  ];

  COLORS = [
    { name: 'Negro', hex: '#111111' },
    { name: 'Blanco', hex: '#FFFFFF' }
  ];
  SIZES = ['Pequeña (20cm)', 'Mediana (25cm)', 'Grande (30cm)'];
  FAQS = [
    { q: '¿Cómo sé si mi pieza quedará como la imagino?', a: 'Antes de crear tu pieza te comparto un boceto digital para tu aprobación, con ajustes incluidos.' },
    { q: '¿Cómo funcionan los envíos?', a: 'Hacemos entregas a todo el país vía Uber Moto, Vimenpaq o BM Cargo, según tu ubicación.' },
    { q: '¿Qué pasa si necesito mi pedido con urgencia?', a: 'Escríbeme antes de ordenar y confirmamos disponibilidad.' },
    { q: '¿Qué pasa si quiero algo que no está en el catálogo?', a: 'Puedes usar el formulario de encargo personalizado y contarme tu idea.' }
  ];

  async componentDidMount() {
    const check = () => this.setState({ isMobile: window.innerWidth < 860 });
    check();
    window.addEventListener('resize', check);
    let products = this.DEFAULT_PRODUCTS;
    try {
      const cms = await import('./cms.js');
      const data = await cms.getPageContent('tienda');
      if (data.products && data.products.length) products = data.products;
    } catch (e) {}
    const id = new URLSearchParams(window.location.search).get('id') || 'p1';
    const product = products.find(x => x.id === id) || products[0] || this.DEFAULT_PRODUCTS[0];
    this.setState({ product, allProducts: products });
    if (product) document.title = `${product.name} | Life Deco Art`;
  }

  renderVals() {
    const m = this.state.isMobile;
    const product = this.state.product || this.DEFAULT_PRODUCTS[0];
    const colors = this.COLORS.map(c => ({
      ...c,
      ring: this.state.color === c.name ? '0 0 0 2px #fff, 0 0 0 4px #F65091' : (c.hex === '#FFFFFF' ? '0 0 0 1px #E5DDD0' : 'none'),
      onClick: () => this.setState({ color: c.name })
    }));
    const sizes = this.SIZES.map(x => ({
      label: x,
      border: this.state.size === x ? '#F65091' : '#E5DDD0',
      color: this.state.size === x ? '#F65091' : '#2B2420',
      weight: this.state.size === x ? 500 : 400,
      onClick: () => this.setState({ size: x })
    }));
    const faqs = this.FAQS.map((f, i) => ({
      ...f,
      open: this.state.faqOpen === i,
      arrow: this.state.faqOpen === i ? 'rotate(180deg)' : 'rotate(0deg)',
      onClick: () => this.setState({ faqOpen: this.state.faqOpen === i ? null : i })
    }));
    const source = this.state.allProducts.length ? this.state.allProducts : this.DEFAULT_PRODUCTS;
    const related = source.filter(x => x.id !== product.id).slice(0, 4).map(x => ({
      ...x,
      href: `/tienda/producto?id=${encodeURIComponent(x.id)}`
    }));
    const thumbs = [1,2,3,4].map((_, i) => ({
      id: `pd-thumb-${i}`,
      src: product.imageUrl || '',
      placeholder: 'detalle del producto'
    }));
    return {
      navGap: m ? '64px' : '88px',
      crumbPad: m ? '16px 24px 0' : '24px 48px 0',
      mainPad: m ? '20px 24px 40px' : '32px 48px 60px',
      mainCols: m ? '1fr' : '1fr 1fr',
      mainGap: m ? '32px' : '80px',
      h1Size: m ? '26px' : '38px',
      relatedPad: m ? '20px 24px 50px' : '40px 48px 90px',
      relatedCols: m ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
      relatedGap: m ? '24px 16px' : '32px',
      h2Size: m ? '22px' : '30px',
      h2Gap: m ? '24px' : '36px',
      faqPad: m ? '0 24px 60px' : '0 48px 100px',
      isMobile: m,
      product,
      mainImage: product.imageUrl || '',
      thumbs,
      colors,
      sizes,
      includes: ['Pieza elaborada a mano', 'Boceto digital previo', 'Personalización según disponibilidad'],
      excludes: ['Envío incluido en el precio'],
      whatsappUrl: 'https://wa.me/18495390410?text=' + encodeURIComponent(`Hola! Me interesa ${product.name} (${product.price}).`),
      related,
      faqs
    };
  }
}

'''
s = s[:start] + new_class + s[end:]
p.write_text(s)
print('Product detail is now CMS-driven by ?id=')
