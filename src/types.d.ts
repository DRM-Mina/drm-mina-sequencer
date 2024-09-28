export type { SettlementInputs, SettlementConfig, CycleConfig };

type SettlementInputs = {
    drm: DRM;
    feepayerKey: PrivateKey;
};

type SettlementConfig = {
    RETRY_WAIT_MS: number;
    MIN_ACTIONS_TO_REDUCE: number;
    MAX_RETRIES_BEFORE_REDUCE: number;
};

type CycleConfig = {
    drm: DRM;
    feepayerKey: PrivateKey;
    counter?: number;
    config: SettlementConfig;
};
