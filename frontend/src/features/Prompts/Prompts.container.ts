import { connect } from "react-redux";
import { bindActionCreators, type Dispatch } from "redux";
import type { GlobalState } from "../../store";
import {
  createPrompt,
  deletePrompt,
  loadPrompts,
  previewPrompt,
  previewPromptClear,
  selectAllPrompts,
  selectIsPreviewLoading,
  selectPromptPreviewResult,
  selectPromptsError,
  selectPromptsLoading,
  updatePrompt,
} from "../../store/slices/prompts";
import Prompts from "./Prompts";

const mapStateToProps = (state: GlobalState) => ({
  templates: selectAllPrompts(state),
  isLoading: selectPromptsLoading(state),
  error: selectPromptsError(state),
  previewResult: selectPromptPreviewResult(state),
  isPreviewLoading: selectIsPreviewLoading(state),
  deletingIds: state.prompts.deletingIds,
});

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      onLoad: loadPrompts,
      onCreate: createPrompt,
      onUpdate: updatePrompt,
      onDelete: deletePrompt,
      onPreview: previewPrompt,
      onPreviewClear: previewPromptClear,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(Prompts);
