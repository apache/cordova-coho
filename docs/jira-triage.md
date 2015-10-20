#JIRA Issue Triage Process

##Goal
Every issue needs to be triaged. A triaged issue is actionable and there is an eventual desire to resolve it and has all the fields set accurately. In particular, low quality issues and eliminated from the system. Also, critical issues need to be fixed asap and this process should highlight those.

##Process
Go through each [unresolved bug that is not labeled 'triaged' ordered by created Date](https://issues.apache.org/jira/issues/?jql=status%20not%20in%20(Resolved%2C%20Closed)%20AND%20(labels%20is%20EMPTY%20OR%20labels%20!%3D%20triaged)%20AND%20%20project%20%3D%20CB%20ORDER%20BY%20createdDate%20DESC).

- Ensure the bug details has sufficient details for a repro. If not, message the reporter with questions. If the reporter does not respond in 2 business days. Resolve the bug as `Invalid`.
- If you can reproduce the issue. Add a label `reproduced`. If not, Resolve the bug as `Cannot reproduce`.
- If you are not an expert in the area or do not have the hardware for triaging, reference the component owner in helping triage the bug.
- Edit the following fields:
	- **Component**: Should be ideally a single component. *For plugin issues do not add platform names here.*
	- **Work item type**: Ensure it has the correct classification - feature request vs task vs bug.
	- **Priority**: 
		- `Blocker`: This will block the current release of the component. 
		- `Critical`: This will cause the main function of the component to fail and needs to be fixed asap. 
		- `Major`: Important one to fix.
		- `Minor`, `Trivial`: Nice to haves.
	- **Label**: Use the following:
		- `regression` - A change introduced in previous release or commit that surfaced the issue. Ideally, add a link to the commit that caused the issue.
		- `ios`, `android`, `windows` etc. platforms - If it is a plugin issue and affects one of these platforms
		- `easyfix` - For issues that are easy for a new contributor to fix. We will eventually publish an easyfix query for new contributors to participate.
		- `triaged` - Indicates bug that has been triaged and does not need to be triaged again.
		- `reproduced` - Bug that has a reproduction.
	- **Environment**: Represents the machine setup required to reproduce the problem. Great place for mobile OS, host OS versions etc.
	- **Affected version**: Specify the version of the component that the issue appears in.

At the end of triage session, send an e-mail to the dev list discussing bugs that need urgent attention. Good bugs in this area are recent regressions or other issues having a wide impact. These would require a patch release to fix them.

##Open issues
- Assignments: Who does JIRA triage? Do we need a weekly rotation duty? Should we publish a schedule? Should we distribute by component?
- Auto-assignments: Currently JIRA has auto-assignments based on component owner. Does that still make sense?
 