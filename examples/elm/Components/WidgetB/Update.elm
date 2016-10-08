module Components.WidgetB.Update exposing (..)

import Components.WidgetB.Model exposing (..)


type Msg
    = Increment
    | Decrement
    | NoOp


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Increment ->
            ( model + 2, Cmd.none )

        Decrement ->
            ( model - 2, Cmd.none )

        NoOp ->
            ( model, Cmd.none )
