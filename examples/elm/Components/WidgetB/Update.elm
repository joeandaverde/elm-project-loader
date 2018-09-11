module Components.WidgetB.Update exposing (..)

import Components.WidgetB.Model exposing (..)


type Msg
    = Increment
    | Decrement
    | NoOp


update : Msg -> Model -> Model
update msg model =
    case msg of
        Increment ->
            model + 2

        Decrement ->
            model - 2

        NoOp ->
            model
