import { createAsyncThunk, unwrapResult } from "@reduxjs/toolkit";
import { selectCurrentToolCall } from "../selectors/selectCurrentToolCall";
import { selectDefaultModel } from "../slices/configSlice";
import {
  acceptToolCall,
  setCalling,
  setToolCallOutput,
} from "../slices/sessionSlice";
import { ThunkApiType } from "../store";
import { streamResponseAfterToolCall } from "./streamResponseAfterToolCall";
import { streamThunkWrapper } from "./streamThunkWrapper";

export const callTool = createAsyncThunk<void, undefined, ThunkApiType>(
  "chat/callTool",
  async (_, { dispatch, extra, getState }) => {
    await dispatch(
      streamThunkWrapper(async () => {
        const state = getState();
        const toolCallState = selectCurrentToolCall(state);

        if (!toolCallState || toolCallState.status !== "generated") {
          throw new Error("Invalid tool call state");
        }

        const defaultModel = selectDefaultModel(state);
        if (!defaultModel) {
          throw new Error("No chat model selected");
        }

        dispatch(setCalling());

        const result = await extra.ideMessenger.request("tools/call", {
          toolCall: toolCallState.toolCall,
          selectedModelTitle: defaultModel.title,
        });
        throw new Error("whoooo");
        if (result.status === "success") {
          const contextItems = result.content.contextItems;
          dispatch(setToolCallOutput(contextItems));
          dispatch(acceptToolCall());

          // Send to the LLM to continue the conversation
          const response = await dispatch(
            streamResponseAfterToolCall({
              toolCallId: toolCallState.toolCall.id,
              toolOutput: contextItems,
            }),
          );
          unwrapResult(response);
        } else {
          // This type of message error we want to pop up in the UI
          // Normal tool call failures will be called
          throw new Error(result.error);
          // dispatch(cancelToolCall());

          // const output = await dispatch(
          //   streamResponseAfterToolCall({
          //     toolCallId: toolCallState.toolCallId,
          //     toolOutput: [
          //       {
          //         icon: "problems",
          //         name: "Tool Call Error",
          //         description: "Tool Call Failed",
          //         content: `The tool call failed with the message:\n\n${result.error}\n\nPlease try something else or request further instructions.`,
          //         hidden: false,
          //       },
          //     ],
          //   }),
          // );
          // unwrapResult(output);
        }
      }),
    );
  },
);
