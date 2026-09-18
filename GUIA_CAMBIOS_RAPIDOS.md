# Guia de cambios rapidos

Esta experiencia esta pensada para operar como una pieza escénica en navegador:
no usa PowerPoint, no requiere internet para correr y separa los textos del motor
visual.

## Como correrla

### Opcion simple para presentadoras

Haz doble clic en `index.html`. No requiere terminal ni instalar servidor.


## Operacion durante la charla

- `Espacio` o `Flecha derecha`: siguiente momento.
- `Flecha izquierda`: momento anterior.
- `F`: pantalla completa.
- `H`: ocultar o mostrar ayudas y controles.
- `R`: reiniciar desde el primer momento.
- En movil o tablet: desliza a izquierda/derecha.
- En la ayuda, usa `ES` o `PT` para cambiar el idioma sin editar codigo.

## Idioma y textos

Los 13 momentos estan en:

```text
moments.js
```

Cada bloque tiene esta forma:

```js
{
  copy: {
    es: {
      title: "El futuro no se hereda. Se construye.",
      subtitle: "",
    },
    pt: {
      title: "O futuro não se herda. Ele se constrói.",
      subtitle: "",
    },
  },
  state: "future",
  intensity: 0.96,
  colors: ["#f7f7f4", "#08a9dd", "#f7353f"],
  behavior: {
    spiral: 0.92,
    network: 0.88,
    architecture: 0.18,
    archive: 0.12,
    stability: 0.64,
  },
}
```

La experiencia abre en portugues por defecto. Para cambiarlo, abre `config.js`
y ajusta:

```js
defaultLanguage: "pt",
```

Usa `"es"` para abrir en espanol.

Durante la charla se puede escoger `ES` o `PT` en
la ayuda. 

Si quiere personalizar frases antes del evento, en el archivo `moments.js` puede c
ambiar `title`, `kicker` o `subtitle` en el idioma correspondiente. 
Los subtitulos pueden quedar vacios con `subtitle: ""`.

## Imagen de ceremonia de grados

Los momentos incluyen algunas imágenes. Son estas: 

```text
assets/slide-02-grados.webp
assets/slide-04-actores.webp
assets/slide-05-impacto.webp
assets/slide-08-rutas.webp
assets/slide-12-futuro.webp
assets/slide-13-cierre.webp
```

Para reemplazarla, guarda una nueva foto con ese mismo nombre y formato en la
carpeta `assets`. No hace falta tocar el codigo.

La imagen se usa como fondo escénico intervenido, no como recuadro de slide.
Funciona mejor si es horizontal, amplia, con buena profundidad y sin texto
importante cerca de los bordes.

Usa este enlace [squoosh](https://squoosh.app/) para optimizar la imagen y reducir el peso del archivo.

## Donde cambiar QR y parametros globales

Abre:

```text
config.js
```

Actualiza estos enlaces cuando existan las URLs finales:

```js
qr: {
  memoryUrl: "https://centrodeeventos.upb.edu.co/",
  socialUrl: "https://www.instagram.com/centrodeeventosupb/",
  memoryImage: "./assets/qr-memory.png",
  socialImage: "./assets/qr-social.png",
}
```

Los PNG actuales estan en `assets/qr-memory.png` y `assets/qr-social.png`.
Si cambias las URLs finales, reemplaza esos PNG por nuevos QR con el mismo
nombre o actualiza `memoryImage` y `socialImage` para apuntar a los nuevos
archivos.

## Estados visuales disponibles

- `latent`: apertura con energia contenida.
- `architecture`: Forum como espacio/arquitectura.
- `opening`: estructura que se abre al mundo.
- `triad`: academia, industria y ciudad.
- `impact`: ondas de impacto.
- `community`: red viva.
- `trust`: conexiones mas estables.
- `routes`: trayectorias y caminos.
- `duality`: dos generaciones coexistiendo.
- `convergence`: generaciones trabajando juntas.
- `present`: energia joven al frente.
- `future`: expansion maxima.
- `qr`: cierre con codigos.

## Paleta actual

La paleta esta ajustada para dialogar con Future Leaders Forum World Cup Edition
2026:

- Cyan: `#08a9dd`
- Rojo: `#f7353f`
- Magenta: `#e96daa`
- Blanco: `#f7f7f4`
- Negro: `#222326`
