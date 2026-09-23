import os

def print_tree(dir_path, prefix=""):
    ignore = {'node_modules', 'artifacts', 'cache', '.git', 'coverage'}
    items = sorted([item for item in os.listdir(dir_path) if item not in ignore])
    for index, item in enumerate(items):
        path = os.path.join(dir_path, item)
        is_last = (index == len(items) - 1)
        connector = "`-- " if is_last else "|-- "
        print(f"{prefix}{connector}{item}")
        if os.path.isdir(path):
            extension = "    " if is_last else "|   "
            print_tree(path, prefix + extension)

if __name__ == "__main__":
    root_dir = r"c:\Users\nehan\Desktop\College\Blockchain\Blockchain-in-Ecommerce"
    print("TruSecure Project Folder Tree:")
    print(".")
    print_tree(root_dir)
