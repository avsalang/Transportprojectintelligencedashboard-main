import argparse
import json
import mimetypes
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from uuid import uuid4


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
DEFAULT_TASK_FILE = WORKSPACE / "theme_tagging_new_semantic_rpt50" / "ai_tagging_tasks.jsonl"
DEFAULT_ENDPOINT = "/v1/responses"
API_BASE = "https://api.openai.com/v1"


def read_jsonl(path, limit=None):
    rows = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                rows.append(json.loads(line))
            if limit and len(rows) >= limit:
                break
    return rows


def request_json(method, path, api_key, payload=None):
    data = None
    headers = {
        "Authorization": f"Bearer {api_key}",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(
        f"{API_BASE}{path}",
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI API error {error.code}: {detail}") from error


def upload_file(path, api_key):
    boundary = f"----codex-theme-boundary-{uuid4().hex}"
    file_bytes = path.read_bytes()
    content_type = mimetypes.guess_type(path.name)[0] or "application/jsonl"
    body = b"".join(
        [
            f"--{boundary}\r\n".encode("utf-8"),
            b'Content-Disposition: form-data; name="purpose"\r\n\r\n',
            b"batch\r\n",
            f"--{boundary}\r\n".encode("utf-8"),
            f'Content-Disposition: form-data; name="file"; filename="{path.name}"\r\n'.encode("utf-8"),
            f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"),
            file_bytes,
            b"\r\n",
            f"--{boundary}--\r\n".encode("utf-8"),
        ]
    )
    request = urllib.request.Request(
        f"{API_BASE}/files",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI file upload error {error.code}: {detail}") from error


def download_file(file_id, output_path, api_key):
    request = urllib.request.Request(
        f"{API_BASE}/files/{file_id}/content",
        headers={"Authorization": f"Bearer {api_key}"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            output_path.write_bytes(response.read())
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI file download error {error.code}: {detail}") from error


def batch_input_path(task_file, model, limit):
    suffix = f"{model.replace('/', '_')}"
    if task_file.stem != "ai_tagging_tasks":
        suffix += f"_{task_file.stem}"
    if limit:
        suffix += f"_pilot{limit}"
    return task_file.parent / f"openai_batch_input_{suffix}.jsonl"


def state_path(task_file, model, limit):
    suffix = f"{model.replace('/', '_')}"
    if task_file.stem != "ai_tagging_tasks":
        suffix += f"_{task_file.stem}"
    if limit:
        suffix += f"_pilot{limit}"
    return task_file.parent / f"openai_batch_state_{suffix}.json"


def make_batch_input(task_file, model, limit, max_output_tokens, reasoning_effort):
    tasks = read_jsonl(task_file, limit=limit)
    if not tasks:
        raise RuntimeError(f"No tasks found in {task_file}")

    output_path = batch_input_path(task_file, model, limit)
    with output_path.open("w", encoding="utf-8", newline="\n") as handle:
        for task in tasks:
            body = {
                "model": model,
                "input": [
                    {"role": "system", "content": task["instructions"]},
                    {
                        "role": "user",
                        "content": (
                            "Tag these CRS transport finance records. "
                            "Return one result for every task_record_id.\n\n"
                            + json.dumps({"records": task["records"]}, ensure_ascii=False)
                        ),
                    },
                ],
                "text": {
                    "format": {
                        "type": "json_schema",
                        "name": "new_theme_tagging",
                        "strict": True,
                        "schema": task["response_schema"],
                    }
                },
                "max_output_tokens": max_output_tokens,
            }
            if reasoning_effort:
                body["reasoning"] = {"effort": reasoning_effort}

            row = {
                "custom_id": task["custom_id"],
                "method": "POST",
                "url": DEFAULT_ENDPOINT,
                "body": body,
            }
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")

    return output_path, len(tasks)


def save_state(path, data):
    state = {}
    if path.exists():
        state = json.loads(path.read_text(encoding="utf-8"))
    state.update(data)
    state["updated_at"] = int(time.time())
    path.write_text(json.dumps(state, indent=2), encoding="utf-8")
    return state


def load_state(path):
    if not path.exists():
        raise RuntimeError(f"No state file found at {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def require_api_key():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Set OPENAI_API_KEY before submitting, checking, or downloading.")
    return api_key


def command_prepare(args):
    output_path, count = make_batch_input(
        args.task_file,
        args.model,
        args.limit,
        args.max_output_tokens,
        args.reasoning_effort,
    )
    print(f"Wrote {count} batch requests to {output_path}")


def command_submit(args):
    api_key = require_api_key()
    output_path, count = make_batch_input(
        args.task_file,
        args.model,
        args.limit,
        args.max_output_tokens,
        args.reasoning_effort,
    )
    print(f"Prepared {count} batch requests: {output_path}")
    file_obj = upload_file(output_path, api_key)
    print(f"Uploaded batch input file: {file_obj['id']}")
    batch = request_json(
        "POST",
        "/batches",
        api_key,
        {
            "input_file_id": file_obj["id"],
            "endpoint": DEFAULT_ENDPOINT,
            "completion_window": "24h",
            "metadata": {
                "description": "CRS new theme semantic tagging",
                "model": args.model,
                "task_file": str(args.task_file),
                "limit": str(args.limit or ""),
            },
        },
    )
    state = save_state(
        state_path(args.task_file, args.model, args.limit),
        {
            "model": args.model,
            "limit": args.limit,
            "task_file": str(args.task_file),
            "batch_input_file": str(output_path),
            "openai_input_file_id": file_obj["id"],
            "openai_batch_id": batch["id"],
            "status": batch["status"],
        },
    )
    print(json.dumps(state, indent=2))


def command_status(args):
    api_key = require_api_key()
    state = load_state(state_path(args.task_file, args.model, args.limit))
    batch = request_json("GET", f"/batches/{state['openai_batch_id']}", api_key)
    save_state(
        state_path(args.task_file, args.model, args.limit),
        {
            "status": batch["status"],
            "output_file_id": batch.get("output_file_id"),
            "error_file_id": batch.get("error_file_id"),
            "request_counts": batch.get("request_counts"),
        },
    )
    print(json.dumps(batch, indent=2))


def command_download(args):
    api_key = require_api_key()
    state_file = state_path(args.task_file, args.model, args.limit)
    state = load_state(state_file)
    batch = request_json("GET", f"/batches/{state['openai_batch_id']}", api_key)
    if batch["status"] != "completed":
        raise RuntimeError(f"Batch is {batch['status']}, not completed yet.")

    output_file_id = batch.get("output_file_id")
    error_file_id = batch.get("error_file_id")
    if not output_file_id:
        raise RuntimeError("Completed batch has no output_file_id.")

    stem = f"openai_batch_output_{args.model.replace('/', '_')}"
    if args.task_file.stem != "ai_tagging_tasks":
        stem += f"_{args.task_file.stem}"
    if args.limit:
        stem += f"_pilot{args.limit}"
    output_path = args.task_file.parent / f"{stem}.jsonl"
    download_file(output_file_id, output_path, api_key)
    updates = {"output_file_id": output_file_id, "output_path": str(output_path)}

    if error_file_id:
        error_path = args.task_file.parent / f"{stem}_errors.jsonl"
        download_file(error_file_id, error_path, api_key)
        updates["error_file_id"] = error_file_id
        updates["error_path"] = str(error_path)

    save_state(state_file, updates)
    print(f"Downloaded output to {output_path}")
    if error_file_id:
        print(f"Downloaded errors to {updates['error_path']}")


def build_parser():
    parser = argparse.ArgumentParser(description="Prepare and run OpenAI Batch API theme tagging.")
    parser.add_argument(
        "command",
        choices=["prepare", "submit", "status", "download"],
        help="prepare only writes the OpenAI batch JSONL; submit uploads and starts the batch.",
    )
    parser.add_argument("--task-file", type=Path, default=DEFAULT_TASK_FILE)
    parser.add_argument("--model", default="gpt-5.4-mini")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of 50-record task groups. Use for pilot runs, e.g. --limit 2.",
    )
    parser.add_argument("--max-output-tokens", type=int, default=16000)
    parser.add_argument(
        "--reasoning-effort",
        default=None,
        choices=["minimal", "low", "medium", "high"],
        help="Optional reasoning effort for models that support it.",
    )
    return parser


def main():
    args = build_parser().parse_args()
    if args.command == "prepare":
        command_prepare(args)
    elif args.command == "submit":
        command_submit(args)
    elif args.command == "status":
        command_status(args)
    elif args.command == "download":
        command_download(args)


if __name__ == "__main__":
    main()
