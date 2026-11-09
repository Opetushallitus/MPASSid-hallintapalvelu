import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSiblingSchoolConfig } from "./useSiblingSchoolConfig";

const getIntegrationDiscoveryInformation = vi.fn();
vi.mock("@/api", () => ({
  getIntegrationDiscoveryInformation: (...args: unknown[]) =>
    getIntegrationDiscoveryInformation(...args),
}));

/** A promise the test resolves/rejects by hand. */
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

type Params = Parameters<typeof useSiblingSchoolConfig>[0];
const base: Params = {
  enabled: true,
  organizationOid: "1.2.246.562.10.1",
  integrationId: 0,
  institutionTypes: [11],
  environment: 1,
  reloadToken: 0,
};

beforeEach(() => {
  getIntegrationDiscoveryInformation.mockReset();
});

describe("useSiblingSchoolConfig", () => {
  it.each([
    ["ei kouluja", { ...base, enabled: false }],
    ["ei organisaatiota", { ...base, organizationOid: undefined }],
    ["ei oppilaitostyyppejä", { ...base, institutionTypes: [] }],
  ])("ei hae, kun mitään ei ole ladattavissa: %s", (_name, params) => {
    const { result } = renderHook(() => useSiblingSchoolConfig(params));
    expect(result.current.status).toBe("skipped");
    expect(getIntegrationDiscoveryInformation).not.toHaveBeenCalled();
  });

  it("ei-tuotantoympäristö: ei hakua, tulos kantaa tyypit ja ympäristön", () => {
    const { result } = renderHook(() =>
      useSiblingSchoolConfig({ ...base, environment: 0 })
    );
    expect(result.current).toMatchObject({
      status: "nonProduction",
      institutionTypes: [11],
      environment: 0,
    });
    expect(getIntegrationDiscoveryInformation).not.toHaveBeenCalled();
  });

  it("tuotanto: hakee kerran ja palauttaa tuloksen (puuttuva kenttä -> null)", async () => {
    getIntegrationDiscoveryInformation.mockResolvedValue({ existingIncluded: ["30001"] });
    const { result } = renderHook(() => useSiblingSchoolConfig(base));

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(result.current).toMatchObject({
      existingIncluded: ["30001"],
      existingExcluded: null,
      institutionTypes: [11],
    });
    expect(getIntegrationDiscoveryInformation).toHaveBeenCalledTimes(1);
    expect(getIntegrationDiscoveryInformation).toHaveBeenCalledWith({
      organizationOid: base.organizationOid,
      institutionType: [11],
      id: 0,
    });
  });

  it("virhe palautetaan tilana", async () => {
    getIntegrationDiscoveryInformation.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useSiblingSchoolConfig(base));
    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("kilpailutilanne: myöhässä saapuva vanhan valinnan vastaus ei ylikirjoita uudempaa", async () => {
    const slow = deferred<object>();
    const fast = deferred<object>();
    getIntegrationDiscoveryInformation
      .mockReturnValueOnce(slow.promise) // [11]
      .mockReturnValueOnce(fast.promise); // [11, 15]

    const { result, rerender } = renderHook((params: Params) => useSiblingSchoolConfig(params), {
      initialProps: base,
    });
    rerender({ ...base, institutionTypes: [11, 15] });

    await act(async () => {
      fast.resolve({ existingIncluded: null, existingExcluded: null });
    });
    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(result.current).toMatchObject({ institutionTypes: [11, 15], existingIncluded: null });

    // The answer for [11] arrives last - it must be ignored.
    await act(async () => {
      slow.resolve({ existingIncluded: ["30001"], existingExcluded: null });
    });
    expect(result.current).toMatchObject({ institutionTypes: [11, 15], existingIncluded: null });
  });

  it("reloadToken hakee uudelleen samoilla parametreilla", async () => {
    getIntegrationDiscoveryInformation.mockResolvedValue({ existingIncluded: null, existingExcluded: null });
    const { result, rerender } = renderHook((params: Params) => useSiblingSchoolConfig(params), {
      initialProps: base,
    });
    await waitFor(() => expect(result.current.status).toBe("ok"));
    const firstKey = result.current.key;

    rerender({ ...base, reloadToken: 1 });
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(result.current.key).not.toBe(firstKey);
    expect(getIntegrationDiscoveryInformation).toHaveBeenCalledTimes(2);
  });
});
