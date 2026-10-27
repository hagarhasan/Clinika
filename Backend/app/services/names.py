def split_full_name(full: str) -> tuple[str, str]:
    """الفرونت فيه خانة Full Name واحدة؛ بنقسمها: أول كلمة = الاسم الأول، الباقي = اسم العائلة."""
    parts = full.split()
    if len(parts) < 2:
        raise ValueError("Please enter first and last name")
    return parts[0][:70], " ".join(parts[1:])[:70]
