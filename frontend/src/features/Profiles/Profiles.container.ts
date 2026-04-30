import { connect } from "react-redux";
import { bindActionCreators, type Dispatch } from "redux";

import type { GlobalState } from "../../store";
import {
  createProfile,
  deleteProfile,
  duplicateProfile,
  loadProfiles,
  selectAllProfiles,
  selectProfilesDeletingId,
  selectProfilesError,
  selectProfilesLoading,
  selectProfilesSaving,
  selectSuggestingKey,
  suggestGlossaryTerms,
  updateProfile,
} from "../../store/slices/profiles";
import Profiles from "./Profiles";
import type { ProfilesDispatchProps, ProfilesStateProps } from "./types";

const mapStateToProps = (state: GlobalState): ProfilesStateProps => ({
  profiles: selectAllProfiles(state),
  isLoading: selectProfilesLoading(state),
  saving: selectProfilesSaving(state),
  deletingId: selectProfilesDeletingId(state),
  error: selectProfilesError(state),
  suggestions: state.profiles.suggestions,
  suggestingKey: selectSuggestingKey(state),
});

const mapDispatchToProps = (dispatch: Dispatch): ProfilesDispatchProps =>
  bindActionCreators(
    {
      onLoad: loadProfiles,
      onCreate: createProfile,
      onUpdate: updateProfile,
      onDelete: deleteProfile,
      onDuplicate: duplicateProfile,
      onSuggest: suggestGlossaryTerms,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(Profiles);
