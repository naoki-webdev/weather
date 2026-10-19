import { useState } from "react";
import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";

type Group = { name: string; ids: number[] };
function loadGroups(key: string): Group[] {
  try {
    const values: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(values) ? values.filter((value): value is Group => value && typeof value.name === "string" && value.name.length <= 40 && Array.isArray(value.ids) && value.ids.length <= 4 && value.ids.every((id: unknown) => typeof id === "number" && Number.isSafeInteger(id) && id > 0)).slice(0,20) : [];
  } catch { return []; }
}
export default function CityGroups({ owner, ids, onApply }: { owner?: number; ids: number[]; onApply: (ids: number[]) => void }) {
  const key = "weather:groups:" + owner;
  const [stored, setStored] = useState({ key, groups: loadGroups(key) });
  const groups = stored.key === key ? stored.groups : loadGroups(key);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const save = (next: Group[]) => {
    try { localStorage.setItem(key,JSON.stringify(next)); setStored({ key,groups: next }); setError(""); }
    catch { setError("グループを保存できませんでした。"); }
  };
  return <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={1}>
    <Typography fontWeight={700}>都市グループ（この端末に保存）</Typography>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
      <TextField size="small" label="グループ名" value={name} inputProps={{ maxLength: 40 }} onChange={(e) => setName(e.target.value)} placeholder="旅行候補・出張先" />
      <Button disabled={!owner || !name.trim() || ids.length < 2 || groups.length >= 20 && !groups.some((group) => group.name === name.trim())} onClick={() => { save([...groups.filter((group) => group.name !== name.trim()), { name: name.trim(), ids }]); setName(""); }}>選択中の都市を保存</Button>
      <TextField select size="small" label="保存したグループ" value={selected} sx={{ minWidth: 170 }} onChange={(e) => setSelected(e.target.value)}><MenuItem value="">選択してください</MenuItem>{groups.map((group) => <MenuItem key={group.name} value={group.name}>{group.name}</MenuItem>)}</TextField>
      <Button disabled={!groups.some((group) => group.name === selected)} onClick={() => onApply(groups.find((group) => group.name === selected)!.ids)}>比較に読み込む</Button>
      <Button disabled={!selected} onClick={() => { save(groups.filter((group) => group.name !== selected)); setSelected(""); }}>グループを削除</Button>
    </Stack>
    {error && <Alert severity="error">{error}</Alert>}
  </Stack></Paper>;
}
