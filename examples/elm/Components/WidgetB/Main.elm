module Components.WidgetB.Main exposing (..)

import Browser
import Components.WidgetB.Model exposing (Model, initialModel)
import Components.WidgetB.Update as Update exposing (Msg, update)
import Components.WidgetB.View exposing (view)


main : Program () Model Msg
main =
    Browser.sandbox
        { init = initialModel
        , update = update
        , view = view
        }
