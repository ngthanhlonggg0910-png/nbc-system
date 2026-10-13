function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function getSnapshotItems(snapshot) {
  if (
    !snapshot ||
    typeof snapshot !== "object"
  ) {
    return [];
  }

  if (Array.isArray(snapshot.details)) {
    return snapshot.details;
  }

  if (Array.isArray(snapshot.items)) {
    return snapshot.items;
  }

  return [];
}

function getItemKey(item) {
  return (
    item.code ||
    item.itemCode ||
    item.item_code ||
    String(
      item.salaryItemId ||
        item.salary_item_id ||
        item.id,
    )
  );
}

function getItemLabel(item) {
  return (
    item.label ||
    item.itemLabel ||
    item.item_label ||
    item.code ||
    item.itemCode ||
    "Khoản lương"
  );
}

function getItemCategory(item) {
  return item.category || "income";
}

function getItemAmount(item) {
  return toNumber(item.amount);
}

export function compareSnapshotItems(
  fromSnapshot,
  toSnapshot,
) {
  const fromItems =
    getSnapshotItems(fromSnapshot);

  const toItems =
    getSnapshotItems(toSnapshot);

  const fromMap = new Map(
    fromItems.map((item) => [
      getItemKey(item),
      item,
    ]),
  );

  const toMap = new Map(
    toItems.map((item) => [
      getItemKey(item),
      item,
    ]),
  );

  const keys = new Set([
    ...fromMap.keys(),
    ...toMap.keys(),
  ]);

  return [...keys]
    .map((key) => {
      const fromItem =
        fromMap.get(key);

      const toItem =
        toMap.get(key);

      const oldAmount = fromItem
        ? getItemAmount(fromItem)
        : 0;

      const newAmount = toItem
        ? getItemAmount(toItem)
        : 0;

      const difference =
        newAmount - oldAmount;

      return {
        code: key,

        label: getItemLabel(
          toItem || fromItem,
        ),

        category: getItemCategory(
          toItem || fromItem,
        ),

        oldAmount,
        newAmount,
        difference,

        changeType:
          difference > 0
            ? "increase"
            : difference < 0
              ? "decrease"
              : "unchanged",
      };
    })
    .sort((first, second) => {
      if (
        first.category !==
        second.category
      ) {
        return first.category.localeCompare(
          second.category,
        );
      }

      return first.label.localeCompare(
        second.label,
        "vi",
      );
    });
}

function getSnapshotTotal(
  snapshot,
  key,
) {
  if (
    !snapshot ||
    typeof snapshot !== "object"
  ) {
    return 0;
  }

  if (
    snapshot.summary &&
    snapshot.summary[key] !==
      undefined
  ) {
    return toNumber(
      snapshot.summary[key],
    );
  }

  if (
    snapshot.payslip &&
    snapshot.payslip[key] !==
      undefined
  ) {
    return toNumber(
      snapshot.payslip[key],
    );
  }

  return toNumber(snapshot[key]);
}

export function compareSnapshotSummary(
  fromSnapshot,
  toSnapshot,
) {
  const fields = [
    {
      key: "grossIncome",
      snakeKey: "gross_income",
      label: "Tổng thu nhập",
    },
    {
      key: "taxableIncome",
      snakeKey: "taxable_income",
      label: "Thu nhập chịu thuế",
    },
    {
      key: "totalDeductions",
      snakeKey: "total_deductions",
      label: "Tổng khấu trừ",
    },
    {
      key: "netSalary",
      snakeKey: "net_salary",
      label: "Thực lĩnh",
    },
  ];

  return fields.map((field) => {
    const oldAmount =
      getSnapshotTotal(
        fromSnapshot,
        field.key,
      ) ||
      getSnapshotTotal(
        fromSnapshot,
        field.snakeKey,
      );

    const newAmount =
      getSnapshotTotal(
        toSnapshot,
        field.key,
      ) ||
      getSnapshotTotal(
        toSnapshot,
        field.snakeKey,
      );

    return {
      code: field.key,
      label: field.label,
      oldAmount,
      newAmount,
      difference:
        newAmount - oldAmount,
    };
  });
}
