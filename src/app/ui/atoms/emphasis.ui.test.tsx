import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmphasizedLastWord } from "./emphasis";

describe("EmphasizedLastWord", () => {
  it("sets only the last word in an em, keeping the text whole", () => {
    render(
      <h2>
        <EmphasizedLastWord text="¿Querés sumarte?" />
      </h2>,
    );
    const heading = screen.getByRole("heading");

    expect(heading).toHaveTextContent("¿Querés sumarte?");
    expect(heading.querySelector("em")).toHaveTextContent("sumarte?");
    expect(heading.querySelectorAll("em")).toHaveLength(1);
  });

  it("emphasizes the whole text when it is a single word", () => {
    render(
      <h2>
        <EmphasizedLastWord text="Hablemos" />
      </h2>,
    );

    expect(screen.getByRole("heading").querySelector("em")).toHaveTextContent(
      "Hablemos",
    );
  });

  it("ignores trailing spaces", () => {
    render(
      <h2>
        <EmphasizedLastWord text="Eventos privados  " />
      </h2>,
    );

    expect(screen.getByRole("heading").querySelector("em")).toHaveTextContent(
      "privados",
    );
  });
});
