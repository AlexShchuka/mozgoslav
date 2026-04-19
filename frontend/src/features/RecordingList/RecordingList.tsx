import {type FC, useEffect} from "react";
import {formatDuration} from "../../core/utils/format";
import type {RecordingListProps} from "./types";
import {EmptyState, ErrorText, FileName, Item, List, ListHeader, Meta, Title,} from "./RecordingList.style";

const BACKEND_UNAVAILABLE_MESSAGE = "Бэкенд не отвечает. Запусти backend.";

const RecordingList: FC<RecordingListProps> = ({
                                                   recordings,
                                                   isLoading,
                                                   isBackendUnavailable,
                                                   error,
                                                   onLoad,
                                               }) => {
    useEffect(() => {
        onLoad();
    }, [onLoad]);

    return (
        <section>
            <ListHeader>
                <Title>Записи</Title>
            </ListHeader>
            {error && <ErrorText data-testid="recording-error">{error}</ErrorText>}
            {isBackendUnavailable ? (
                <EmptyState data-testid="recording-empty-backend">
                    {BACKEND_UNAVAILABLE_MESSAGE}
                </EmptyState>
            ) : recordings.length === 0 ? (
                <EmptyState data-testid="recording-empty">
                    {isLoading ? "Загружаем…" : "Пока нет записей. Импортируй аудио, чтобы начать."}
                </EmptyState>
            ) : (
                <List data-testid="recording-list">
                    {recordings.map((recording) => (
                        <Item key={recording.id}>
                            <FileName>{recording.fileName}</FileName>
                            <Meta>
                                {formatDuration(recording.duration)} · {recording.status}
                            </Meta>
                        </Item>
                    ))}
                </List>
            )}
        </section>
    );
};

export default RecordingList;
