import { createAsyncThunk } from "@reduxjs/toolkit";
import { MessageModes } from "core";
import { setEditDone } from "../slices/editModeState";
import {
  clearCodeToEdit,
  selectIsInEditMode,
  selectIsSingleRangeEditOrInsertion,
  setLastMode,
  setMainEditorContentTrigger,
  setMode,
} from "../slices/sessionSlice";
import { ThunkApiType } from "../store";

export const exitEditMode = createAsyncThunk<
  void,
  {
    success: boolean;
  },
  ThunkApiType
>("edit/complete", async ({ success }, { dispatch, extra, getState }) => {
  const state = getState();
  if (!(state.session.mode === "edit")) {
    return;
  }

  if (success) {
    dispatch(setMainEditorContentTrigger(undefined));
  }
  await dispatch(changeModeTo(state.session.lastMode ?? "chat"));

  const isInEditMode = selectIsInEditMode(state);
  const codeToEdit = state.session.codeToEdit;
  const isSingleRangeEditOrInsertion =
    selectIsSingleRangeEditOrInsertion(state);

  dispatch(setMode("chat"));

  for (const code of codeToEdit) {
    extra.ideMessenger.post("rejectDiff", {
      filepath: code.filepath,
    });
  }

  dispatch(clearCodeToEdit());
  dispatch(setEditDone());
  dispatch(setMainEditorContentTrigger(undefined));

  extra.ideMessenger.post("edit/exit", {
    shouldFocusEditor: isSingleRangeEditOrInsertion,
  });
});

export const changeModeTo = createAsyncThunk<
  void,
  MessageModes | "cycle",
  ThunkApiType
>("mode/change", async (mode, { dispatch, extra, getState }) => {
  const state = getState();

  const currentMode = state.session.mode;
  const lastMode = state.session.lastMode ?? "chat";

  if (currentMode === mode) {
    return;
  }

  let newMode: MessageModes;
  if (currentMode === "edit") {
    newMode = lastMode;
    // leaving edit mode
    for (const code of state.session.codeToEdit) {
      extra.ideMessenger.post("rejectDiff", {
        filepath: code.filepath,
      });
    }

    dispatch(clearCodeToEdit());
    dispatch(setEditDone());

    const isSingleRangeEditOrInsertion =
      selectIsSingleRangeEditOrInsertion(state);
    extra.ideMessenger.post("edit/exit", {
      shouldFocusEditor: isSingleRangeEditOrInsertion,
    });
  } else {
    dispatch(setLastMode(currentMode)); // last mode can't be "edit"
  }
  dispatch(setMode(newMode));
});

// CMD L
// dispatch(clearCodeToEdit());

//       if (historyLength > 0) {
//         await dispatch(
//           saveCurrentSession({
//             openNewSession: false,
//             generateTitle: true,
//           }),
//         );
//       }

// LISTBOX
// if (newMode === mode) {
//   return;
// }
// dispatch(setMode(newMode));
// if (newMode === "edit") {
//   await dispatch(
//     saveCurrentSession({
//       generateTitle: false,
//       openNewSession: true,
//     }),
//   );
// } else if (mode === "edit") {
//   await dispatch(
//     loadLastSession({
//       saveCurrentSession: false,
//     }),
//   );
//   dispatch(exitEditMode());
// }

// on ACCEPT
// await dispatch(
//   loadLastSession({
//     saveCurrentSession: false,
//   }),
// );
