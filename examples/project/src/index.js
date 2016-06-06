const Elm = require('../my-app.elmproj')

console.log(Elm)

Elm.Components.WidgetA.Main.embed(document.getElementById('widgetA'))
Elm.Components.WidgetB.Main.embed(document.getElementById('widgetB'))
