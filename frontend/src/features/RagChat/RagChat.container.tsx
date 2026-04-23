import {FC, useCallback, useEffect, useMemo, useState} from "react";
import {connect} from "react-redux";
import {bindActionCreators, type Dispatch} from "redux";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {toast} from "react-toastify";

import {apiFactory} from "../../api";
import {askQuestion, selectRagIsAsking, selectRagMessages} from "../../store/slices/rag";
import type {RagCitation, RagMessage} from "../../store/slices/rag/types";
import type {GlobalState} from "../../store";
import {noteRoute} from "../../constants/routes";
import RagChat from "./RagChat";
import type {RagIndexStatus} from "./types";

interface StateProps {
    readonly messages: readonly RagMessage[];
    readonly isAsking: boolean;
}

interface DispatchProps {
    readonly onAsk: (question: string) => void;
}

const mapStateToProps = (state: GlobalState): StateProps => ({
    messages: selectRagMessages(state),
    isAsking: selectRagIsAsking(state),
});

const mapDispatchToProps = (dispatch: Dispatch) =>
    bindActionCreators(
        {
            onAsk: (question: string) => askQuestion(question),
        },
        dispatch,
    );

type Wired = StateProps & DispatchProps;

const RagChatContainer: FC<Wired> = (props) => {
    const navigate = useNavigate();
    const {t} = useTranslation();
    const ragApi = useMemo(() => apiFactory.createRagApi(), []);
    const [status, setStatus] = useState<RagIndexStatus | null>(null);
    const [isReindexing, setIsReindexing] = useState(false);

    const refreshStatus = useCallback(async (): Promise<void> => {
        try {
            const next = await ragApi.status();
            setStatus(next);
        } catch {
            setStatus(null);
        }
    }, [ragApi]);

    useEffect(() => {
        void refreshStatus();
    }, [refreshStatus]);

    const onCitationNavigate = useCallback(
        (citation: RagCitation) =>
            navigate(`${noteRoute(citation.noteId)}?segment=${encodeURIComponent(citation.chunkId)}`),
        [navigate],
    );

    const onReindex = useCallback(async (): Promise<void> => {
        if (isReindexing) return;
        setIsReindexing(true);
        try {
            const result = await ragApi.reindex();
            toast.success(t("rag.reindexedToast", {count: result.embeddedNotes}));
            await refreshStatus();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
        } finally {
            setIsReindexing(false);
        }
    }, [isReindexing, ragApi, refreshStatus, t]);

    return (
        <RagChat
            messages={props.messages}
            isAsking={props.isAsking}
            status={status}
            isReindexing={isReindexing}
            onAsk={props.onAsk}
            onReindex={() => {
                void onReindex();
            }}
            onCitationNavigate={onCitationNavigate}
        />
    );
};

export default connect(mapStateToProps, mapDispatchToProps)(RagChatContainer);
