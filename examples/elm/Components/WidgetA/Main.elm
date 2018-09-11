module Components.WidgetA.Main exposing (..)

import Browser
import Components.WidgetA.Model exposing (Model, initialModel)
import Components.WidgetA.Update as Update exposing (Msg, update)
import Components.WidgetA.View exposing (view)


main : Program () Model Msg
main =
    Browser.sandbox
        { init = initialModel
        , update = update
        , view = view
        }
