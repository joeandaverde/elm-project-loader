module Components.WidgetA.Main exposing (..)

import Html
import Components.WidgetA.Model exposing (Model, initialModel)
import Components.WidgetA.View exposing (view)
import Components.WidgetA.Update as Update exposing (update)


main =
    Html.program
        { init = ( initialModel, Cmd.none )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }
