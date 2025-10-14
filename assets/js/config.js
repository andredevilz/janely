// config.js (global UMD simples)
(function (w) {
  const DEFAULT_CONFIG = {
    currency: "EUR",
    locale: "pt-PT",
    minAreaFactor: 0.80,
    systems: {
      "55": {label:"Perfil CASEMENT 55-T", addEUR:200, img:"https://elika.world/wp-content/uploads/2025/07/c55t.png"},
      "65": {label:"Perfil CASEMENT 65-T", addEUR:500, img:"https://elika.world/wp-content/uploads/2025/07/c65t.png"}
    },
    colors: {
      ral_single: { label:"RAL monocromático",    addEUR:0   },
      wood_like:  { label:"Veneer efeito madeira",addEUR:120 },
      ral_dual:   { label:"RAL bicolor",          addEUR:180 }
    },
    energy: {
      two:   { label:"Duplo vidro (Ug 0,19)", addEUR:0   },
      three: { label:"Triplo vidro (Ug 0,09)", addEUR:150 }
    },
    stores: {
      motor:   { none:{label:"Sem motor",addEUR:0}, motor:{label:"Motor tubular",addEUR:180} },
      lamella: { pvc39:{label:"Lâmina PVC 39 mm",addEUR:0}, alu45:{label:"Lâmina Alumínio 45 mm",addEUR:60} },
      box:     { b150:{label:"Caixa 150 mm",addEUR:0}, b180:{label:"Caixa 180 mm",addEUR:25}, b205:{label:"Caixa 205 mm",addEUR:45} },
      control: { fita:{label:"Fita manual",addEUR:0}, int:{label:"Interruptor",addEUR:20}, rf:{label:"Comando RF",addEUR:60} },
      guides:  { g53:{label:"Guias 53 mm",addEUR:0}, g66:{label:"Guias 66 mm reforçadas",addEUR:35} },
      install: { exterior:{label:"Aplicação exterior",addEUR:0}, monobloc:{label:"Monobloco",addEUR:70}, interior:{label:"Aplicação interior",addEUR:40} },
      accessory:{ trava:{label:"Trava estore",addEUR:12}, clic:{label:"Fecho clic-clac",addEUR:8}, fimcurso:{label:"Fins de curso reg.",addEUR:18} }
    },
    tabs: [
      { label:"Janelas 1 folha", limits:{wMin:32,wMax:200,hMin:32,hMax:280},
        models:[
          {title:"Janela fixa – em aro", price:378, img:"https://elika.world/wp-content/uploads/2024/08/alum1.jpg"},
          {title:"Janela basculante (tilt)", price:626, img:"https://elika.world/wp-content/uploads/2024/08/alum2.gif"},
          {title:"Janela oscilo-batente", price:653, img:"https://elika.world/wp-content/uploads/2024/08/alum3.gif"},
          {title:"Janela de batente lateral", price:626, img:"https://elika.world/wp-content/uploads/2024/08/window15.gif"},
        ]},
      { label:"Janelas 2 folhas", limits:{wMin:100,wMax:400,hMin:100,hMax:400},
        models:[
          {title:"Fixa – em aro", price:300, img:"https://elika.world/wp-content/uploads/2024/08/window4.jpg"},
          {title:"Oscilo-batente + FIX em aro", price:805, img:"https://elika.world/wp-content/uploads/2024/08/window5.gif"},
          {title:"Oscilo-batente + batente", price:1045, img:"https://elika.world/wp-content/uploads/2024/08/window8.gif"},
          {title:"Oscilo-batente + basculante", price:628, img:"https://elika.world/wp-content/uploads/2024/08/window10.gif"},
          {title:"FIX em aro + oscilo-batente", price:664, img:"https://elika.world/wp-content/uploads/2024/08/window11.gif"},
          {title:"Batente + oscilo-batente + basculante", price:681, img:"https://elika.world/wp-content/uploads/2024/08/window13.gif"},
          {title:"Batente + oscilo-batente + FIX em aro", price:772, img:"https://elika.world/wp-content/uploads/2024/08/window14.gif"},
        ]},
      { label:"Janelas 3 folhas", limits:{wMin:150,wMax:600,hMin:150,hMax:600},
        models:[
          {title:"FIX + oscilo-batente + FIX", price:408, img:"https://elika.world/wp-content/uploads/2024/08/window20.gif"},
          {title:"Batente + FIX + oscilo-batente", price:822, img:"https://elika.world/wp-content/uploads/2024/08/window21.gif"},
          {title:"Batente + batente + oscilo-batente", price:566, img:"https://elika.world/wp-content/uploads/2024/08/window22.gif"},
        ]},
      { label:"Janelas 4 folhas", limits:{wMin:32,wMax:200,hMin:32,hMax:280},
        models:[{title:"Janela 4 folhas", price:751, img:"https://elika.world/wp-content/uploads/2024/08/window23.gif"}]},
      { label:"Portas/Janelas de varanda", limits:{wMin:32,wMax:200,hMin:32,hMax:280},
        models:[
          {title:"Porta 1 folha abre para fora", price:1838, img:"https://elika.world/wp-content/uploads/2024/08/window15.gif"},
          {title:"Porta 1 folha abre para dentro", price:2133, img:"https://elika.world/wp-content/uploads/2024/08/window16.gif"},
          {title:"Porta de varanda de batente", price:1500, img:"https://elika.world/wp-content/uploads/2024/08/Turn-balcony-door.gif"},
          {title:"Batente + batente (postigo móvel)", price:1800, img:"https://elika.world/wp-content/uploads/2024/08/Turn-turn-balcony-door-movable-post.gif"},
          {title:"Porta de correr", price:1508, img:"https://elika.world/wp-content/uploads/2024/08/Sliding-balcony-door.gif"},
        ]},
      { label:"Estores", limits:{wMin:50,wMax:400,hMin:50,hMax:350},
        models:[
          {title:"Estore PVC",      price:240, img:"assets/images/estore-pvc.png"},
          {title:"Estore Alumínio", price:295, img:"assets/images/estore-aluminio.png"}
        ]}
    ]
  };

  w.CONFIG = { DEFAULT_CONFIG };
})(window);
