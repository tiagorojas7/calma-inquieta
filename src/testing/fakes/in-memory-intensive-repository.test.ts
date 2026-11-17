import { runIntensiveProjectContract } from "~/testing/contracts/intensive-project-repository.contract";
import { runIntensiveRepositoryContract } from "~/testing/contracts/intensive-repository.contract";
import { InMemoryIntensiveRepository } from "./in-memory-intensive-repository";

runIntensiveRepositoryContract(() =>
  Promise.resolve(new InMemoryIntensiveRepository()),
);

runIntensiveProjectContract(() => {
  const repo = new InMemoryIntensiveRepository();
  return Promise.resolve({
    repo,
    reference(_intensiveId, projectId) {
      repo.referencedProjects.add(projectId);
      return Promise.resolve();
    },
  });
});
