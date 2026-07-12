
"""MCP tool registry ? maps tool name to handler function"""

from .market import MARKET_TOOLS
from .limit import LIMIT_TOOLS
from .capital import CAPITAL_TOOLS
from .review import REVIEW_TOOLS

ALL_TOOLS = {}
ALL_TOOLS.update(MARKET_TOOLS)
ALL_TOOLS.update(LIMIT_TOOLS)
ALL_TOOLS.update(CAPITAL_TOOLS)
ALL_TOOLS.update(REVIEW_TOOLS)
