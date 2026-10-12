import { declaration } from "../structured/document";
import { schemeEngine } from "./document";
export function createAccessScheme() {
  const elements = [
    declaration("diagram", "access", "Аутентификация и права", {
      type: "access",
    }),
  ];
  const steps = [
    ["user", "Пользователь", "principal"],
    ["authentication", "Аутентификация", "authentication"],
    ["authorization", "Проверка прав", "authorization"],
    ["allow", "Разрешённая операция", "operation"],
    ["deny", "Отказ", "deny"],
  ];
  for (const [id, label, role] of steps)
    elements.push(
      declaration("block", id, label, {
        role,
        shape: role === "authorization" ? "diamond" : "rounded",
      }),
      declaration("view", `${id}View`, "", { diagram: "access", element: id }),
    );
  for (const [i, [from, to, label]] of [
    ["user", "authentication", ""],
    ["authentication", "authorization", "Успешно"],
    ["authorization", "allow", "Разрешено"],
    ["authorization", "deny", "Отказ"],
  ].entries())
    elements.push(
      declaration("link", `link${i}`, label, { from, to, kind: "directed" }),
      declaration("view", `link${i}View`, "", {
        diagram: "access",
        element: `link${i}`,
        from: `${from}View`,
        to: `${to}View`,
      }),
    );
  const d = schemeEngine.create({
    id: "accessModel",
    label: "Схема доступа",
    elements,
  });
  return schemeEngine.move(
    d,
    Object.fromEntries(
      steps.map(([id], i) => [
        `${id}View`,
        {
          x: i === 4 ? 480 : 100,
          y: i === 4 ? 430 : 70 + i * 180,
          height: i === 2 ? 140 : 100,
        },
      ]),
    ),
  );
}
