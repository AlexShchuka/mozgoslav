import { connect } from "react-redux";
import { bindActionCreators, type Dispatch } from "redux";
import type { GlobalState } from "../../store";
import {
  cancelModelDownload,
  closeDownloadsDrawer,
  downloadModel,
  selectActiveDownloadList,
  selectCancellingDownloadId,
  selectIsDownloadsDrawerOpen,
} from "../../store/slices/models";
import DownloadsDrawer from "./DownloadsDrawer";

const mapStateToProps = (state: GlobalState) => ({
  isOpen: selectIsDownloadsDrawerOpen(state),
  downloads: selectActiveDownloadList(state),
  cancellingDownloadId: selectCancellingDownloadId(state),
});

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    { onCancel: cancelModelDownload, onClose: closeDownloadsDrawer, onRetry: downloadModel },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(DownloadsDrawer);
