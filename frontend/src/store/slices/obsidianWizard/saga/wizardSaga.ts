import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import {
  MutationObsidianRunWizardStepDocument,
  type MutationObsidianRunWizardStepMutation,
} from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { mapGqlDiagnostics } from "../../obsidian/diagnosticsMapper";
import {
  RUN_WIZARD_STEP,
  type RunWizardStepAction,
  runWizardStepDone,
  runWizardStepFailed,
} from "../actions";

export function* wizardSaga(action: RunWizardStepAction): SagaIterator {
  try {
    const data = (yield* gqlRequest(MutationObsidianRunWizardStepDocument, {
      step: action.payload.step,
    })) as MutationObsidianRunWizardStepMutation;
    const payload = data.obsidianRunWizardStep;
    if (payload.errors.length > 0) {
      yield put(runWizardStepFailed(payload.errors[0].message));
      return;
    }
    const diagnostics = payload.diagnostics ? mapGqlDiagnostics(payload.diagnostics) : null;
    yield put(runWizardStepDone(payload.currentStep, payload.nextStep ?? null, diagnostics));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(runWizardStepFailed(message));
  }
}

export function* watchWizardSaga(): SagaIterator {
  yield takeLatest(RUN_WIZARD_STEP, wizardSaga);
}
