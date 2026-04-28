from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["web-extract"])


class WebExtractRequest(BaseModel):
    url: str


class WebExtractResponse(BaseModel):
    title: str | None
    body: str | None
    lang: str | None
    excerpt: str | None


@router.post("/web-extract", response_model=WebExtractResponse)
def web_extract(payload: WebExtractRequest) -> WebExtractResponse:
    if not payload.url.strip():
        raise HTTPException(status_code=422, detail="url required")

    try:
        import trafilatura

        downloaded = trafilatura.fetch_url(payload.url)
        if not downloaded:
            return WebExtractResponse(title=None, body=None, lang=None, excerpt=None)

        result = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            no_fallback=False,
            output_format="txt",
            with_metadata=True,
        )

        if result is None:
            return WebExtractResponse(title=None, body=None, lang=None, excerpt=None)

        metadata = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            no_fallback=False,
            output_format="xmltei",
            with_metadata=True,
        )

        title: str | None = None
        lang: str | None = None

        if metadata:
            import xml.etree.ElementTree as ET

            try:
                root = ET.fromstring(metadata)
                ns = {"tei": "http://www.tei-c.org/ns/1.0"}
                title_el = root.find(".//tei:titleStmt/tei:title", ns)
                if title_el is not None:
                    title = title_el.text
                lang_el = root.find(".//{http://www.w3.org/XML/1998/namespace}lang")
                if lang_el is not None:
                    lang = lang_el.text
            except ET.ParseError:
                pass

        excerpt: str | None = None
        if result:
            first_para = result.strip().split("\n\n")[0]
            excerpt = first_para[:300] if first_para else None

        return WebExtractResponse(
            title=title,
            body=result,
            lang=lang,
            excerpt=excerpt,
        )
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"trafilatura not installed: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"extraction failed: {exc}",
        ) from exc
