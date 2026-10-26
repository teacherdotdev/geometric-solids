import { browser } from "$app/environment";
import type { UnitKey, UnitLabels } from "$lib/domain/format";
import { RANGE_MESSAGE, STEP_MESSAGE } from "$lib/domain/validation";

export type LanguageCode = "en" | "es" | "fr";

const en = {
  name: "English",
  locale: "en",
  ui: {
    "language.change": "Change language",
    "app.name": "Geometric Solids",
    "app.pageTitle": "Geometric Solids — surface area and volume",
    "app.description":
      "An interactive lab for exploring surface area and volume.",
    "lab.answersVisible": "Final answers are visible.",
    "lab.answersHidden": "Final answers are hidden.",
    "lab.units": "Units",
    "lab.floatError": "Could not open the floating window: {error}",
    "floating.title": "Geometric Solids is floating",
    "floating.instructions":
      "Switch to the textbook tab and keep this tab open. Your work stays in the floating window, and its back-to-tab button brings you here again.",
    "floating.return": "Bring Geometric Solids back here",
    "float.open": "Float Geometric Solids over other tabs",
    "float.unsupported": "Floating windows are not supported by this browser",
    "float.failed": "The floating window could not be opened.",
    "float.button": "Float",
    "view.label": "View",
    "view.solid": "Solid",
    "view.net": "Net",
    "view.noNet.before": "A sphere has ",
    "view.noNet.strong": "no flat net",
    "view.noNet.after":
      ": its surface cannot be flattened without stretching, which is why world maps distort countries.",
    "shape.label": "Solid",
    "measure.dimensions": "Dimensions, in {unit}",
    "measure.show": "{label}. {hint}. Show it on the shape.",
    "measure.decrease": "Decrease {label} by {step}",
    "measure.inUnit": "{label} in {unit}",
    "measure.increase": "Increase {label} by {step}",
    "measure.slider": "{label} slider, in {unit}",
    "measure.still": "{message}. Still {value} {unit}.",
    "validation.number": "Enter a number",
    "validation.range": "Enter a number from 0.1 to 100000",
    "validation.step": "Use steps of 0.1, for example 2.5",
    "totals.label": "Totals",
    "totals.hidden": "hidden",
    "totals.hideAnswers": "Hide the answers",
    "totals.showAnswers": "Show the answers",
    "totals.hideFormulas": "Hide the formulas",
    "totals.showFormulas": "Show the formulas",
    "rotation.label": "Rotate the 3D view",
    "rotation.left": "Rotate left",
    "rotation.back": "Tip back",
    "rotation.forward": "Tip forward",
    "rotation.right": "Rotate right",
    "rotation.reset": "Reset the view",
    "rotation.stop": "Stop spinning",
    "rotation.spin": "Spin the shape",
    "rotation.reduced":
      "Continuous spinning is off because this device asks for reduced motion",
    "approx.more": "{short}. Show more decimal places: {detailed}",
    "brand.action":
      "Built by teacher.dev — put the logo on the stage as a solid",
    "brand.title": "Built by teacher.dev",
    "common.builtBy": "Built by teacher.dev",
    "common.about": "about",
    "common.privacy": "privacy",
    "common.back": "← Back to the interactive",
    "solid.description":
      "{name} with {dimensions} {unit}. Drag or use the arrow keys to rotate. Point at a face or an edge to measure it.",
    "net.description": "Flat net of the {name}",
    "grid.key": "Each grid square is {size} {unit} across",
    "about.pageTitle": "About — Geometric Solids",
    "about.meta":
      "Geometric Solids is a free, ad-free classroom tool for teaching surface area and volume, built by teacher.dev.",
    "about.title": "About",
    "about.lede":
      "A teacher-led demonstration of how a solid's dimensions relate to its surface area and volume.",
    "about.originTitle": "From the EdTech-a-thon",
    "about.origin.beforeEvent": "Geometric Solids came out of the ",
    "about.origin.afterEvent":
      ", a community of builders making free tools for classrooms. It is maintained by ",
    "about.origin.afterTeacher":
      ", where you can find the rest of what we are building.",
    "about.photoAlt": "Participants of the 2026 EdTech-a-thon",
    "about.purposeTitle": "What it is for",
    "about.purpose":
      "Put a solid on the board, change its dimensions, and watch the surface area and the volume move with them. Every total is kept exact — as a multiple of π or a square root where that is the honest answer — so the class can see where a formula comes from before anyone reaches for a calculator. Unfold a solid into its net to see the surface area as the faces it is actually made of.",
    "about.promiseTitle": "Our promise",
    "about.promise.paywalls": "Zero paywalls.",
    "about.promise.ads": "Zero ads.",
    "about.promise.tracking": "Zero tracking of personal data.",
    "about.feedbackTitle": "Feedback & ideas",
    "about.feedback":
      "We'd love to hear from you. Tell us what's working, what's not, or pitch us an idea for a tool you wish existed. We're here to help.",
    "about.email": "Email support@teacher.dev",
    "privacy.pageTitle": "Privacy — Geometric Solids",
    "privacy.meta": "What Geometric Solids collects, what it doesn't, and why.",
    "privacy.title": "Privacy",
    "privacy.lede": "What we collect, what we don't, and why.",
    "privacy.local":
      "Geometric Solids does not collect personal information from teachers or students. There are no accounts, and nothing you type into it — dimensions, units, the solid you pick — is sent anywhere or saved anywhere. It all lives in the page for as long as the tab is open, and it is gone when you close it.",
    "privacy.analytics.beforeLink":
      "We use Cloudflare Web Analytics to anonymously count visits, which helps us understand how Geometric Solids is being used in classrooms. Cloudflare Web Analytics is cookieless, does not fingerprint visitors, and does not track users across other sites; see Cloudflare's ",
    "privacy.analytics.link": "privacy policy",
    "privacy.analytics.afterLink":
      " for details. We do not share, sell, or otherwise transfer any visitor data to third parties.",
    "privacy.contact": "Questions or concerns? Email ",
  },
  domain: {},
  units: {
    units: {
      key: "units",
      name: "Generic units",
      linear: "units",
      area: "square units",
      volume: "cubic units",
      areaShort: "sq units",
      volumeShort: "cu units",
    },
    cm: {
      key: "cm",
      name: "Centimetres",
      linear: "cm",
      area: "cm²",
      volume: "cm³",
      areaShort: "cm²",
      volumeShort: "cm³",
    },
    m: {
      key: "m",
      name: "Metres",
      linear: "m",
      area: "m²",
      volume: "m³",
      areaShort: "m²",
      volumeShort: "m³",
    },
    in: {
      key: "in",
      name: "Inches",
      linear: "in",
      area: "in²",
      volume: "in³",
      areaShort: "in²",
      volumeShort: "in³",
    },
  } satisfies Record<UnitKey, UnitLabels>,
} as const;

type UiKey = keyof typeof en.ui;
type Language = {
  readonly name: string;
  readonly locale: string;
  readonly ui: Record<UiKey, string>;
  readonly domain: Readonly<Record<string, string>>;
  readonly units: Record<UnitKey, UnitLabels>;
};

const es = {
  name: "Español",
  locale: "es",
  ui: {
    "language.change": "Cambiar idioma",
    "app.name": "Geometric Solids",
    "app.pageTitle": "Geometric Solids — área superficial y volumen",
    "app.description":
      "Un laboratorio interactivo para explorar el área superficial y el volumen.",
    "lab.answersVisible": "Las respuestas finales están visibles.",
    "lab.answersHidden": "Las respuestas finales están ocultas.",
    "lab.units": "Unidades",
    "lab.floatError": "No se pudo abrir la ventana flotante: {error}",
    "floating.title": "Geometric Solids está flotando",
    "floating.instructions":
      "Cambia a la pestaña del libro de texto y mantén esta pestaña abierta. Tu trabajo permanece en la ventana flotante, y su botón para volver a la pestaña te traerá aquí de nuevo.",
    "floating.return": "Traer Geometric Solids de vuelta aquí",
    "float.open": "Mostrar Geometric Solids sobre otras pestañas",
    "float.unsupported": "Este navegador no admite ventanas flotantes",
    "float.failed": "No se pudo abrir la ventana flotante.",
    "float.button": "Flotar",
    "view.label": "Vista",
    "view.solid": "Sólido",
    "view.net": "Red",
    "view.noNet.before": "Una esfera ",
    "view.noNet.strong": "no tiene una red plana",
    "view.noNet.after":
      ": su superficie no se puede aplanar sin estirarla; por eso los mapas del mundo deforman los países.",
    "shape.label": "Sólido",
    "measure.dimensions": "Dimensiones, en {unit}",
    "measure.show": "{label}. {hint}. Mostrar en la figura.",
    "measure.decrease": "Disminuir {label} en {step}",
    "measure.inUnit": "{label} en {unit}",
    "measure.increase": "Aumentar {label} en {step}",
    "measure.slider": "Control de {label}, en {unit}",
    "measure.still": "{message}. Se mantiene en {value} {unit}.",
    "validation.number": "Introduce un número",
    "validation.range": "Introduce un número entre 0.1 y 100000",
    "validation.step": "Usa incrementos de 0.1; por ejemplo, 2.5",
    "totals.label": "Totales",
    "totals.hidden": "oculto",
    "totals.hideAnswers": "Ocultar las respuestas",
    "totals.showAnswers": "Mostrar las respuestas",
    "totals.hideFormulas": "Ocultar las fórmulas",
    "totals.showFormulas": "Mostrar las fórmulas",
    "rotation.label": "Girar la vista 3D",
    "rotation.left": "Girar a la izquierda",
    "rotation.back": "Inclinar hacia atrás",
    "rotation.forward": "Inclinar hacia delante",
    "rotation.right": "Girar a la derecha",
    "rotation.reset": "Restablecer la vista",
    "rotation.stop": "Detener el giro",
    "rotation.spin": "Girar la figura",
    "rotation.reduced":
      "El giro continuo está desactivado porque este dispositivo solicita movimiento reducido",
    "approx.more": "{short}. Mostrar más decimales: {detailed}",
    "brand.action":
      "Creado por teacher.dev — colocar el logotipo en el escenario como un sólido",
    "brand.title": "Creado por teacher.dev",
    "common.builtBy": "Creado por teacher.dev",
    "common.about": "acerca de",
    "common.privacy": "privacidad",
    "common.back": "← Volver al interactivo",
    "solid.description":
      "{name} con {dimensions} {unit}. Arrastra o usa las flechas para girarlo. Señala una cara o una arista para medirla.",
    "net.description": "Red plana de {name}",
    "grid.key": "Cada cuadrado de la cuadrícula mide {size} {unit}",
    "about.pageTitle": "Acerca de — Geometric Solids",
    "about.meta":
      "Geometric Solids es una herramienta gratuita y sin anuncios para enseñar área superficial y volumen, creada por teacher.dev.",
    "about.title": "Acerca de",
    "about.lede":
      "Una demostración guiada por docentes de cómo las dimensiones de un sólido se relacionan con su área superficial y su volumen.",
    "about.originTitle": "Del EdTech-a-thon",
    "about.origin.beforeEvent": "Geometric Solids nació en el ",
    "about.origin.afterEvent":
      ", una comunidad de creadores que desarrolla herramientas gratuitas para las aulas. Lo mantiene ",
    "about.origin.afterTeacher":
      ", donde puedes encontrar el resto de lo que estamos creando.",
    "about.photoAlt": "Participantes del EdTech-a-thon 2026",
    "about.purposeTitle": "Para qué sirve",
    "about.purpose":
      "Pon un sólido en la pizarra, cambia sus dimensiones y observa cómo cambian con ellas el área superficial y el volumen. Cada total se mantiene exacto —como múltiplo de π o como raíz cuadrada cuando esa es la respuesta correcta— para que la clase pueda ver de dónde sale una fórmula antes de usar la calculadora. Despliega un sólido en su red para ver el área superficial como las caras que realmente lo componen.",
    "about.promiseTitle": "Nuestra promesa",
    "about.promise.paywalls": "Cero muros de pago.",
    "about.promise.ads": "Cero anuncios.",
    "about.promise.tracking": "Cero seguimiento de datos personales.",
    "about.feedbackTitle": "Comentarios e ideas",
    "about.feedback":
      "Nos encantaría saber de ti. Cuéntanos qué funciona, qué no, o propón una herramienta que te gustaría que existiera. Estamos aquí para ayudar.",
    "about.email": "Escribir a support@teacher.dev",
    "privacy.pageTitle": "Privacidad — Geometric Solids",
    "privacy.meta": "Qué recopila Geometric Solids, qué no y por qué.",
    "privacy.title": "Privacidad",
    "privacy.lede": "Qué recopilamos, qué no y por qué.",
    "privacy.local":
      "Geometric Solids no recopila información personal de docentes ni estudiantes. No hay cuentas, y nada de lo que introduces —dimensiones, unidades o el sólido que eliges— se envía ni se guarda en ningún lugar. Todo permanece en la página mientras la pestaña está abierta y desaparece cuando la cierras.",
    "privacy.analytics.beforeLink":
      "Usamos Cloudflare Web Analytics para contar visitas de forma anónima, lo que nos ayuda a entender cómo se usa Geometric Solids en las aulas. Cloudflare Web Analytics no utiliza cookies, no crea huellas digitales de los visitantes ni los rastrea en otros sitios; consulta la ",
    "privacy.analytics.link": "política de privacidad",
    "privacy.analytics.afterLink":
      " de Cloudflare para obtener más información. No compartimos, vendemos ni transferimos de otro modo datos de visitantes a terceros.",
    "privacy.contact": "¿Tienes preguntas o dudas? Escribe a ",
  },
  domain: {
    "Rectangular prism": "Prisma rectangular",
    Cube: "Cubo",
    "Right-triangular prism": "Prisma triangular recto",
    "Square pyramid": "Pirámide cuadrada",
    Cylinder: "Cilindro",
    Cone: "Cono",
    Sphere: "Esfera",
    "teacher.dev key": "tecla de teacher.dev",
    "Top face": "Cara superior",
    "Bottom face": "Cara inferior",
    "Front face": "Cara frontal",
    "Back face": "Cara posterior",
    "Left face": "Cara izquierda",
    "Right face": "Cara derecha",
    "Front triangular base": "Base triangular frontal",
    "Back triangular base": "Base triangular posterior",
    "Rectangle on leg a": "Rectángulo sobre el cateto a",
    "Rectangle on leg b": "Rectángulo sobre el cateto b",
    "Rectangle on hypotenuse c": "Rectángulo sobre la hipotenusa c",
    "Square base": "Base cuadrada",
    "Front triangular face": "Cara triangular frontal",
    "Back triangular face": "Cara triangular posterior",
    "Left triangular face": "Cara triangular izquierda",
    "Right triangular face": "Cara triangular derecha",
    "Top disk": "Disco superior",
    "Bottom disk": "Disco inferior",
    "Curved side": "Superficie lateral curva",
    "Base disk": "Disco de la base",
    "Curved surface": "Superficie curva",
    "Bevel side 1": "Lado biselado 1",
    "Bevel side 2": "Lado biselado 2",
    "Bevel side 3": "Lado biselado 3",
    "Bevel side 4": "Lado biselado 4",
    "Four rounded bevel corners": "Cuatro esquinas biseladas redondeadas",
    "All edges equal": "Todas las aristas iguales",
    "Hypotenuse c": "Hipotenusa c",
    "Slant height s": "Apotema lateral s",
    "Base circumference C": "Circunferencia de la base C",
    "Diameter d": "Diámetro d",
    "Bevel edge t": "Arista biselada t",
    Length: "Longitud",
    Width: "Anchura",
    Height: "Altura",
    Side: "Lado",
    "Leg a": "Cateto a",
    "Leg b": "Cateto b",
    "Prism length": "Longitud del prisma",
    "Base side": "Lado de la base",
    Radius: "Radio",
    "Straight side": "Lado recto",
    "Bezel radius": "Radio del borde",
    Bevel: "Bisel",
    "Edge running left to right": "Arista que va de izquierda a derecha",
    "Edge running front to back": "Arista que va de delante hacia atrás",
    "Edge running bottom to top": "Arista que va de abajo hacia arriba",
    "Every edge of a cube is this length":
      "Todas las aristas del cubo tienen esta longitud",
    "First perpendicular leg of the right triangle":
      "Primer cateto perpendicular del triángulo rectángulo",
    "Second perpendicular leg of the right triangle":
      "Segundo cateto perpendicular del triángulo rectángulo",
    "Distance between the two triangular bases":
      "Distancia entre las dos bases triangulares",
    "Length of each side of the square base":
      "Longitud de cada lado de la base cuadrada",
    "Perpendicular height from the base to the apex":
      "Altura perpendicular desde la base hasta el vértice",
    "Radius of each circular base": "Radio de cada base circular",
    "Perpendicular distance between the bases":
      "Distancia perpendicular entre las bases",
    "Radius of the circular base": "Radio de la base circular",
    "Perpendicular height from base to apex":
      "Altura perpendicular desde la base hasta el vértice",
    "Distance from the centre to the surface":
      "Distancia desde el centro hasta la superficie",
    "The flat run along one side, between two rounded corners":
      "Tramo recto de un lado entre dos esquinas redondeadas",
    "Radius of each rounded corner on the top face":
      "Radio de cada esquina redondeada de la cara superior",
    "How much farther out the bottom extends on every side":
      "Cuánto sobresale la parte inferior por cada lado",
    "Perpendicular distance from the bottom face to the top face":
      "Distancia perpendicular entre la cara inferior y la superior",
  },
  units: {
    units: {
      key: "units",
      name: "Unidades genéricas",
      linear: "unidades",
      area: "unidades cuadradas",
      volume: "unidades cúbicas",
      areaShort: "u²",
      volumeShort: "u³",
    },
    cm: {
      key: "cm",
      name: "Centímetros",
      linear: "cm",
      area: "cm²",
      volume: "cm³",
      areaShort: "cm²",
      volumeShort: "cm³",
    },
    m: {
      key: "m",
      name: "Metros",
      linear: "m",
      area: "m²",
      volume: "m³",
      areaShort: "m²",
      volumeShort: "m³",
    },
    in: {
      key: "in",
      name: "Pulgadas",
      linear: "in",
      area: "in²",
      volume: "in³",
      areaShort: "in²",
      volumeShort: "in³",
    },
  },
} satisfies Language;

const fr = {
  name: "Français",
  locale: "fr",
  ui: {
    "language.change": "Changer de langue",
    "app.name": "Geometric Solids",
    "app.pageTitle": "Geometric Solids — aire et volume",
    "app.description":
      "Un laboratoire interactif pour explorer l’aire et le volume.",
    "lab.answersVisible": "Les réponses finales sont visibles.",
    "lab.answersHidden": "Les réponses finales sont masquées.",
    "lab.units": "Unités",
    "lab.floatError": "Impossible d’ouvrir la fenêtre flottante : {error}",
    "floating.title": "Geometric Solids est dans une fenêtre flottante",
    "floating.instructions":
      "Passez à l’onglet du manuel et gardez cet onglet ouvert. Votre travail reste dans la fenêtre flottante, et son bouton de retour à l’onglet vous ramènera ici.",
    "floating.return": "Ramener Geometric Solids ici",
    "float.open": "Afficher Geometric Solids au-dessus des autres onglets",
    "float.unsupported":
      "Ce navigateur ne prend pas en charge les fenêtres flottantes",
    "float.failed": "Impossible d’ouvrir la fenêtre flottante.",
    "float.button": "Détacher",
    "view.label": "Vue",
    "view.solid": "Solide",
    "view.net": "Patron",
    "view.noNet.before": "Une sphère ",
    "view.noNet.strong": "n’a pas de patron plan",
    "view.noNet.after":
      " : sa surface ne peut pas être aplatie sans être étirée, ce qui explique pourquoi les cartes du monde déforment les pays.",
    "shape.label": "Solide",
    "measure.dimensions": "Dimensions, en {unit}",
    "measure.show": "{label}. {hint}. Afficher sur la figure.",
    "measure.decrease": "Diminuer {label} de {step}",
    "measure.inUnit": "{label} en {unit}",
    "measure.increase": "Augmenter {label} de {step}",
    "measure.slider": "Curseur de {label}, en {unit}",
    "measure.still": "{message}. La valeur reste {value} {unit}.",
    "validation.number": "Saisissez un nombre",
    "validation.range": "Saisissez un nombre compris entre 0.1 et 100000",
    "validation.step": "Utilisez des pas de 0.1, par exemple 2.5",
    "totals.label": "Totaux",
    "totals.hidden": "masqué",
    "totals.hideAnswers": "Masquer les réponses",
    "totals.showAnswers": "Afficher les réponses",
    "totals.hideFormulas": "Masquer les formules",
    "totals.showFormulas": "Afficher les formules",
    "rotation.label": "Faire pivoter la vue 3D",
    "rotation.left": "Tourner à gauche",
    "rotation.back": "Incliner vers l’arrière",
    "rotation.forward": "Incliner vers l’avant",
    "rotation.right": "Tourner à droite",
    "rotation.reset": "Réinitialiser la vue",
    "rotation.stop": "Arrêter la rotation",
    "rotation.spin": "Faire tourner la figure",
    "rotation.reduced":
      "La rotation continue est désactivée car cet appareil demande des animations réduites",
    "approx.more": "{short}. Afficher plus de décimales : {detailed}",
    "brand.action":
      "Créé par teacher.dev — placer le logo sur la scène comme un solide",
    "brand.title": "Créé par teacher.dev",
    "common.builtBy": "Créé par teacher.dev",
    "common.about": "à propos",
    "common.privacy": "confidentialité",
    "common.back": "← Retour à l’interactif",
    "solid.description":
      "{name} avec {dimensions} {unit}. Faites glisser ou utilisez les flèches pour le faire pivoter. Pointez une face ou une arête pour la mesurer.",
    "net.description": "Patron plan de {name}",
    "grid.key": "Chaque carré du quadrillage mesure {size} {unit}",
    "about.pageTitle": "À propos — Geometric Solids",
    "about.meta":
      "Geometric Solids est un outil pédagogique gratuit et sans publicité pour enseigner l’aire et le volume, créé par teacher.dev.",
    "about.title": "À propos",
    "about.lede":
      "Une démonstration guidée par l’enseignant du lien entre les dimensions d’un solide, son aire et son volume.",
    "about.originTitle": "Issu de l’EdTech-a-thon",
    "about.origin.beforeEvent": "Geometric Solids est né lors de l’",
    "about.origin.afterEvent":
      ", une communauté de créateurs qui conçoivent des outils gratuits pour les classes. Il est maintenu par ",
    "about.origin.afterTeacher": ", où vous trouverez nos autres créations.",
    "about.photoAlt": "Participants à l’EdTech-a-thon 2026",
    "about.purposeTitle": "À quoi sert cet outil",
    "about.purpose":
      "Placez un solide au tableau, modifiez ses dimensions et observez l’évolution de son aire et de son volume. Chaque total reste exact — sous forme d’un multiple de π ou d’une racine carrée lorsque c’est la réponse juste — afin que la classe voie d’où vient une formule avant de prendre une calculatrice. Dépliez un solide pour voir son aire comme l’ensemble des faces qui le composent réellement.",
    "about.promiseTitle": "Notre promesse",
    "about.promise.paywalls": "Aucun accès payant.",
    "about.promise.ads": "Aucune publicité.",
    "about.promise.tracking": "Aucun suivi des données personnelles.",
    "about.feedbackTitle": "Commentaires et idées",
    "about.feedback":
      "Nous serions ravis de vous lire. Dites-nous ce qui fonctionne ou non, ou proposez-nous une idée d’outil que vous aimeriez voir exister. Nous sommes là pour vous aider.",
    "about.email": "Écrire à support@teacher.dev",
    "privacy.pageTitle": "Confidentialité — Geometric Solids",
    "privacy.meta":
      "Ce que Geometric Solids collecte, ce qu’il ne collecte pas et pourquoi.",
    "privacy.title": "Confidentialité",
    "privacy.lede":
      "Ce que nous collectons, ce que nous ne collectons pas et pourquoi.",
    "privacy.local":
      "Geometric Solids ne collecte aucune information personnelle sur les enseignants ou les élèves. Il n’y a pas de compte, et rien de ce que vous saisissez — dimensions, unités ou solide choisi — n’est envoyé ni enregistré. Tout reste dans la page tant que l’onglet est ouvert et disparaît lorsque vous le fermez.",
    "privacy.analytics.beforeLink":
      "Nous utilisons Cloudflare Web Analytics pour compter anonymement les visites, ce qui nous aide à comprendre comment Geometric Solids est utilisé en classe. Cloudflare Web Analytics n’utilise pas de cookies, ne crée pas d’empreinte des visiteurs et ne les suit pas sur d’autres sites ; consultez la ",
    "privacy.analytics.link": "politique de confidentialité",
    "privacy.analytics.afterLink":
      " de Cloudflare pour en savoir plus. Nous ne partageons, ne vendons ni ne transférons d’aucune autre manière les données des visiteurs à des tiers.",
    "privacy.contact": "Des questions ou des préoccupations ? Écrivez à ",
  },
  domain: {
    "Rectangular prism": "Pavé droit",
    Cube: "Cube",
    "Right-triangular prism": "Prisme droit à base triangulaire",
    "Square pyramid": "Pyramide à base carrée",
    Cylinder: "Cylindre",
    Cone: "Cône",
    Sphere: "Sphère",
    "teacher.dev key": "touche teacher.dev",
    "Top face": "Face supérieure",
    "Bottom face": "Face inférieure",
    "Front face": "Face avant",
    "Back face": "Face arrière",
    "Left face": "Face gauche",
    "Right face": "Face droite",
    "Front triangular base": "Base triangulaire avant",
    "Back triangular base": "Base triangulaire arrière",
    "Rectangle on leg a": "Rectangle sur le côté a",
    "Rectangle on leg b": "Rectangle sur le côté b",
    "Rectangle on hypotenuse c": "Rectangle sur l’hypoténuse c",
    "Square base": "Base carrée",
    "Front triangular face": "Face triangulaire avant",
    "Back triangular face": "Face triangulaire arrière",
    "Left triangular face": "Face triangulaire gauche",
    "Right triangular face": "Face triangulaire droite",
    "Top disk": "Disque supérieur",
    "Bottom disk": "Disque inférieur",
    "Curved side": "Surface latérale courbe",
    "Base disk": "Disque de base",
    "Curved surface": "Surface courbe",
    "Bevel side 1": "Côté biseauté 1",
    "Bevel side 2": "Côté biseauté 2",
    "Bevel side 3": "Côté biseauté 3",
    "Bevel side 4": "Côté biseauté 4",
    "Four rounded bevel corners": "Quatre coins biseautés arrondis",
    "All edges equal": "Toutes les arêtes égales",
    "Hypotenuse c": "Hypoténuse c",
    "Slant height s": "Apothème s",
    "Base circumference C": "Circonférence de la base C",
    "Diameter d": "Diamètre d",
    "Bevel edge t": "Arête biseautée t",
    Length: "Longueur",
    Width: "Largeur",
    Height: "Hauteur",
    Side: "Côté",
    "Leg a": "Côté a",
    "Leg b": "Côté b",
    "Prism length": "Longueur du prisme",
    "Base side": "Côté de la base",
    Radius: "Rayon",
    "Straight side": "Côté droit",
    "Bezel radius": "Rayon de la bordure",
    Bevel: "Biseau",
    "Edge running left to right": "Arête allant de gauche à droite",
    "Edge running front to back": "Arête allant de l’avant à l’arrière",
    "Edge running bottom to top": "Arête allant du bas vers le haut",
    "Every edge of a cube is this length":
      "Toutes les arêtes du cube ont cette longueur",
    "First perpendicular leg of the right triangle":
      "Premier côté perpendiculaire du triangle rectangle",
    "Second perpendicular leg of the right triangle":
      "Deuxième côté perpendiculaire du triangle rectangle",
    "Distance between the two triangular bases":
      "Distance entre les deux bases triangulaires",
    "Length of each side of the square base":
      "Longueur de chaque côté de la base carrée",
    "Perpendicular height from the base to the apex":
      "Hauteur perpendiculaire de la base au sommet",
    "Radius of each circular base": "Rayon de chaque base circulaire",
    "Perpendicular distance between the bases":
      "Distance perpendiculaire entre les bases",
    "Radius of the circular base": "Rayon de la base circulaire",
    "Perpendicular height from base to apex":
      "Hauteur perpendiculaire de la base au sommet",
    "Distance from the centre to the surface":
      "Distance du centre à la surface",
    "The flat run along one side, between two rounded corners":
      "Partie droite d’un côté entre deux coins arrondis",
    "Radius of each rounded corner on the top face":
      "Rayon de chaque coin arrondi de la face supérieure",
    "How much farther out the bottom extends on every side":
      "Dépassement de la partie inférieure sur chaque côté",
    "Perpendicular distance from the bottom face to the top face":
      "Distance perpendiculaire entre les faces inférieure et supérieure",
  },
  units: {
    units: {
      key: "units",
      name: "Unités génériques",
      linear: "unités",
      area: "unités carrées",
      volume: "unités cubes",
      areaShort: "u²",
      volumeShort: "u³",
    },
    cm: {
      key: "cm",
      name: "Centimètres",
      linear: "cm",
      area: "cm²",
      volume: "cm³",
      areaShort: "cm²",
      volumeShort: "cm³",
    },
    m: {
      key: "m",
      name: "Mètres",
      linear: "m",
      area: "m²",
      volume: "m³",
      areaShort: "m²",
      volumeShort: "m³",
    },
    in: {
      key: "in",
      name: "Pouces",
      linear: "in",
      area: "in²",
      volume: "in³",
      areaShort: "in²",
      volumeShort: "in³",
    },
  },
} satisfies Language;

const languages: Record<LanguageCode, Language> = { en, es, fr };
const STORAGE_KEY = "shape-lab-language";

export const languageOptions = (Object.keys(languages) as LanguageCode[]).map(
  (code) => ({ code, name: languages[code].name }),
);

export const language = $state<{ code: LanguageCode }>({ code: "en" });
let initialized = false;

function browserCode(): LanguageCode | null {
  const preferred = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const tag of preferred) {
    const code = String(tag ?? "")
      .toLowerCase()
      .split("-")[0];
    if (code in languages) return code as LanguageCode;
  }
  return null;
}

export function initializeLanguage() {
  if (!browser || initialized) return;
  initialized = true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in languages) {
      language.code = saved as LanguageCode;
      return;
    }
  } catch {
    // Private browsing may refuse storage; the language still works this visit.
  }
  language.code = browserCode() ?? "en";
}

export function setLanguage(code: string) {
  if (!(code in languages)) return;
  language.code = code as LanguageCode;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Keep the in-memory choice when storage is unavailable.
  }
}

export function current(): Language {
  return languages[language.code] ?? en;
}

export function t(key: UiKey, values: Record<string, string | number> = {}) {
  const text = current().ui[key] ?? en.ui[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    values[name] === undefined ? match : String(values[name]),
  );
}

export function domainText(text: string): string {
  return current().domain[text] ?? text;
}

export function unitLabels(key: UnitKey): UnitLabels {
  return current().units[key] ?? en.units[key];
}

export function validationMessage(message: string): string {
  if (message === RANGE_MESSAGE) return t("validation.range");
  if (message === STEP_MESSAGE) return t("validation.step");
  if (message === "Enter a number") return t("validation.number");
  return message;
}
