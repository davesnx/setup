"""User search query helper.

Callers pass the search field as name without SQL escaping.
The connection supports execute(query, parameters).
find_user returns the first matching row, or None.
"""


def find_user(connection, name):
    query = f"SELECT id, name FROM users WHERE name = '{name}'"
    return connection.execute(query).fetchone()
