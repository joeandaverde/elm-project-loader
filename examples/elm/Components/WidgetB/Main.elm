module Components.WidgetB.Main exposing (..)

import Html.App as Html
import Html exposing (Html)
import Components.WidgetB.Model exposing (Model, initialModel)
import Components.WidgetB.View exposing (view)
import Components.WidgetB.Update as Update exposing (update)


main =
    Html.program
        { init = ( initialModel, Cmd.none )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }
