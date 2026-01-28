Summary: F5 Telemetry Streaming
Version: %{_version}
Name: %{_name}
Release: %{_release}
BuildArch: noarch
Group: Development/Tools
License: Commercial
Packager: F5, Inc. <support@f5.com>

AutoReqProv: no

%description
Telemetry Streaming for BIG-IP

%global __os_install_post %{nil}

%define IAPP_INSTALL_DIR /var/config/rest/iapps/%{name}

%prep

sh %{main}/scripts/npm/copy-app-to-dir.sh "%{_builddir}" "%{main}"

dstAppDir=%{_builddir}/application
printf "%s" "%{version}-%{release}" > "${dstAppDir}/version"

for pkgName in "package.json" "package-lock.json" "npm-shrinkwrap.json"; do
    pkg="${dstAppDir}/${pkgName}"
    if [ -f "${pkg}" ]; then
        echo "Updating '${pkg}' with build metadata"
        jq --indent 2 \
            --arg buildtimestamp "%{BUILD_TIMESTAMP}" \
            --arg gitbranch "%{GIT_REF_NAME}" \
            --arg githash "%{GIT_COMMIT_SHA}" \
            --arg version "%{version}-%{release}" \
            '. + { buildtimestamp: $buildtimestamp, gitbranch: $gitbranch, githash: $githash, version: $version }' \
            $pkg > tmp.json
        mv tmp.json "${pkg}"
    fi
done

%install
rm -rf $RPM_BUILD_ROOT
mkdir -p $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}
cp -r %{_builddir}/application/* $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}
$(cd $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}/schema; ln -s latest/*.json .)
ls -als $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}/nodejs
mv $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}/nodejs/manifest.json $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}
ls -als $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}

%clean
rm -rf $RPM_BUILD_ROOT

%files
%defattr(-,root,root)
%{IAPP_INSTALL_DIR}
