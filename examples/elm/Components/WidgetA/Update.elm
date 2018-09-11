module Components.WidgetA.Update exposing (..)

import Components.WidgetA.Model exposing (..)


type Msg
    = Increment
    | Decrement
    | NoOp


update : Msg -> Model -> Model
update msg model =
    case msg of
        Increment ->
            model + 1

        Decrement ->
            model - 1

        NoOp ->
            model
