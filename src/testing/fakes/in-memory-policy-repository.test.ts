import { runPolicyRepositoryContract } from "~/testing/contracts/policy-repository.contract";
import { InMemoryPolicyRepository } from "./in-memory-policy-repository";

runPolicyRepositoryContract(() => new InMemoryPolicyRepository());
