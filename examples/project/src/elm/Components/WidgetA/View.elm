module Components.WidgetA.View exposing (..)

import Components.WidgetA.Model exposing (..)
import Components.WidgetA.Update exposing (..)
import Html exposing (Html, div, button, text)
import Html.Events exposing (onClick)


view : Model -> Html Msg
view model =
    div []
        [ button [ onClick Decrement ] [ text "-" ]
        , div [] [ text (toString model) ]
        , button [ onClick Increment ] [ text "+" ]
        ]
