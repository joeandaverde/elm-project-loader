module Components.WidgetB.View exposing (..)

import Components.WidgetB.Model exposing (..)
import Components.WidgetB.Update exposing (..)
import Html exposing (Html, button, div, text)
import Html.Events exposing (onClick)


view : Model -> Html Msg
view model =
    div []
        [ button [ onClick Decrement ] [ text "-" ]
        , div [] [ text (String.fromInt model) ]
        , button [ onClick Increment ] [ text "+" ]
        ]
