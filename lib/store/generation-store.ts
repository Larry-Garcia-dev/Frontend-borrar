import { create } from "zustand";
import { GenerationStore } from "./generation/types";
import { createFormSlice } from "./generation/form-slice";
import { createMediaSlice } from "./generation/media-slice";
import { createExecutionSlice } from "./generation/execution-slice";

export const useGenerationStore = create<GenerationStore>((...args) => ({
  ...createFormSlice(...args),
  ...createMediaSlice(...args),
  ...createExecutionSlice(...args),
}));