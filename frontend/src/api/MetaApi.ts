import BaseApi from "./BaseApi";

export interface MetaInfo {
    readonly version: string;
    readonly commit: string;
    readonly buildDate: string;
}

export class MetaApi extends BaseApi {
    public async getMeta(): Promise<MetaInfo> {
        const response = await this.get<MetaInfo>("/api/meta");
        return response.data;
    }
}
