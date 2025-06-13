from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from app.templates import templates

router = APIRouter()


@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request}
    )


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    # If user is already authenticated, redirect to home
    if hasattr(request.state, 'user') and request.state.user:
        return RedirectResponse(url="/", status_code=302)

    return templates.TemplateResponse(
        "auth/login_page.html",
        {"request": request}
    )


@router.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    # If user is already authenticated, redirect to home
    if hasattr(request.state, 'user') and request.state.user:
        return RedirectResponse(url="/", status_code=302)

    return templates.TemplateResponse(
        "auth/register_page.html",
        {"request": request}
    )


@router.get("/demo", response_class=HTMLResponse)
async def demo_page(request: Request):
    """Demo page showing semantic HTML styling"""
    return templates.TemplateResponse(
        "demo.html",
        {"request": request}
    )
