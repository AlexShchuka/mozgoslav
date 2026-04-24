import BaseApi from "./BaseApi";
import { API_ENDPOINTS } from "../constants/api";
import type { Profile } from "../domain/Profile";

export type ProfileDraft = Omit<Profile, "id" | "isBuiltIn">;

export class ProfilesApi extends BaseApi {
  public async list(): Promise<Profile[]> {
    const response = await this.get<Profile[]>(API_ENDPOINTS.profiles);
    return response.data;
  }

  public async create(payload: ProfileDraft): Promise<Profile> {
    const response = await this.post<Profile, ProfileDraft>(API_ENDPOINTS.profiles, payload);
    return response.data;
  }

  public async update(id: string, payload: ProfileDraft): Promise<Profile> {
    const response = await this.put<Profile, ProfileDraft>(API_ENDPOINTS.profile(id), payload);
    return response.data;
  }

  public async remove(id: string): Promise<void> {
    await this.delete<void>(API_ENDPOINTS.profile(id));
  }

  public async duplicate(id: string): Promise<Profile> {
    const response = await this.post<Profile>(API_ENDPOINTS.duplicateProfile(id));
    return response.data;
  }
}
